# Databricks notebook source

# MAGIC %md
# MAGIC # TAP Map Builder — Replicação Salesforce (Logfood → e2)
# MAGIC
# MAGIC Este notebook replica as tabelas do Salesforce do workspace logfood para o schema local.
# MAGIC
# MAGIC **Rode no workspace de destino** (e2-demo-field-eng). Precisa de um PAT do logfood armazenado em secrets.
# MAGIC
# MAGIC Agende como Job para rodar diariamente (D-1).

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuração
# MAGIC
# MAGIC Parâmetros são injetados automaticamente pelo Job (DAB).
# MAGIC Para rodar manualmente, edite os defaults abaixo.

# COMMAND ----------

dbutils.widgets.text("LOGFOOD_HOST", "https://adb-2548836972759138.18.azuredatabricks.net")
dbutils.widgets.text("LOGFOOD_WAREHOUSE", "071969b1ec9a91ca")
dbutils.widgets.text("SECRET_SCOPE", "pedro-zanela-scope")
dbutils.widgets.text("SECRET_KEY_LOGFOOD_PAT", "logfood-pat")
dbutils.widgets.text("TARGET_CATALOG", "pedro_zanela")
dbutils.widgets.text("TARGET_SCHEMA", "tap")

LOGFOOD_HOST = dbutils.widgets.get("LOGFOOD_HOST")
LOGFOOD_WAREHOUSE = dbutils.widgets.get("LOGFOOD_WAREHOUSE")
SECRET_SCOPE = dbutils.widgets.get("SECRET_SCOPE")
SECRET_KEY_LOGFOOD_PAT = dbutils.widgets.get("SECRET_KEY_LOGFOOD_PAT")
TARGET_CATALOG = dbutils.widgets.get("TARGET_CATALOG")
TARGET_SCHEMA = dbutils.widgets.get("TARGET_SCHEMA")

print(f"Logfood:  {LOGFOOD_HOST} (warehouse: {LOGFOOD_WAREHOUSE})")
print(f"Destino:  {TARGET_CATALOG}.{TARGET_SCHEMA}")
print(f"Secrets:  {SECRET_SCOPE} / {SECRET_KEY_LOGFOOD_PAT}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Tabelas a replicar

# COMMAND ----------

TABLES = {
    "core_accounts": """
        SELECT account_id, account_name, account_executive, vertical, sales_region,
               CAST(snapshot_date AS STRING) AS snapshot_date
        FROM main.it_sfdc_silver.core_accounts
        WHERE snapshot_date >= current_date() - INTERVAL 30 DAYS
    """,
    "account_team_member": """
        SELECT account_id, combined_concatenated_emails, primary_sa_user_name, sa_user_name
        FROM main.gtm_silver.account_team_member
    """,
    "core_opportunity": """
        SELECT account_id,
               CAST(total_price AS STRING)   AS total_price,
               opportunity_type, opportunity_status,
               CAST(start_date AS STRING)    AS start_date,
               CAST(end_date AS STRING)      AS end_date,
               CAST(snapshot_date AS STRING) AS snapshot_date
        FROM main.it_sfdc_silver.core_opportunity
        WHERE snapshot_date >= current_date() - INTERVAL 30 DAYS
          AND contract_opportunity_flag = true
          AND LOWER(opportunity_status) IN ('won', 'active')
    """,
    "individual_hierarchy_workday": """
        SELECT email, manager_name, manager_email, manager_title,
               CAST(snapshot_date AS STRING) AS snapshot_date
        FROM main.gtm_silver.individual_hierarchy_workday
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM main.gtm_silver.individual_hierarchy_workday)
    """,
}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Execução

# COMMAND ----------

import requests
import time
import json

# Ler PAT do logfood
logfood_pat = dbutils.secrets.get(scope=SECRET_SCOPE, key=SECRET_KEY_LOGFOOD_PAT)

def logfood_query(sql: str) -> list[dict]:
    """Executa SQL no logfood via Statement Execution API e retorna linhas como dicts."""
    headers = {"Authorization": f"Bearer {logfood_pat}", "Content-Type": "application/json"}

    # Submeter query
    resp = requests.post(
        f"{LOGFOOD_HOST}/api/2.0/sql/statements",
        headers=headers,
        json={
            "warehouse_id": LOGFOOD_WAREHOUSE,
            "statement": sql,
            "wait_timeout": "50s",
            "disposition": "INLINE",
            "format": "JSON_ARRAY",
        },
    )
    resp.raise_for_status()
    data = resp.json()

    # Aguardar se ainda estiver rodando
    statement_id = data.get("statement_id")
    max_wait = 300
    elapsed = 0
    while data.get("status", {}).get("state") in ("PENDING", "RUNNING"):
        time.sleep(3)
        elapsed += 3
        if elapsed > max_wait:
            raise RuntimeError(f"Logfood query timeout after {max_wait}s")
        r = requests.get(f"{LOGFOOD_HOST}/api/2.0/sql/statements/{statement_id}", headers=headers)
        r.raise_for_status()
        data = r.json()

    state = data.get("status", {}).get("state")
    if state == "FAILED":
        error = data.get("status", {}).get("error", {}).get("message", "Unknown error")
        raise RuntimeError(f"Logfood query failed: {error}")

    # Extrair colunas e linhas
    columns = [c["name"] for c in data.get("manifest", {}).get("schema", {}).get("columns", [])]
    rows = data.get("result", {}).get("data_array", [])

    # Paginação (se houver next_chunk)
    while data.get("result", {}).get("next_chunk_index") is not None:
        chunk_idx = data["result"]["next_chunk_index"]
        r = requests.get(
            f"{LOGFOOD_HOST}/api/2.0/sql/statements/{statement_id}/result/chunks/{chunk_idx}",
            headers=headers,
        )
        r.raise_for_status()
        data["result"] = r.json()
        rows.extend(data["result"].get("data_array", []))

    return [dict(zip(columns, row)) for row in rows]

# COMMAND ----------

# Criar schema se não existir
spark.sql(f"CREATE SCHEMA IF NOT EXISTS {TARGET_CATALOG}.{TARGET_SCHEMA}")
print(f"✅ Schema {TARGET_CATALOG}.{TARGET_SCHEMA} pronto")

# COMMAND ----------

for table_name, sql in TABLES.items():
    full_name = f"{TARGET_CATALOG}.{TARGET_SCHEMA}.{table_name}"
    print(f"\n▸ Replicando {table_name}...")

    try:
        rows = logfood_query(sql)
        print(f"  Linhas recebidas: {len(rows)}")

        if not rows:
            print(f"  ⚠️ Sem dados — pulando")
            continue

        # Converter para Spark DataFrame e salvar como Delta
        df = spark.createDataFrame(rows)
        df.write.mode("overwrite").option("overwriteSchema", "true").saveAsTable(full_name)

        count = spark.table(full_name).count()
        print(f"  ✅ {full_name} — {count} linhas")

    except Exception as e:
        print(f"  ❌ Erro: {e}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Verificação

# COMMAND ----------

for table_name in TABLES:
    full_name = f"{TARGET_CATALOG}.{TARGET_SCHEMA}.{table_name}"
    try:
        count = spark.table(full_name).count()
        print(f"✅ {full_name}: {count} linhas")
    except:
        print(f"❌ {full_name}: não encontrada")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Próximos passos
# MAGIC
# MAGIC Para automatizar, agende este notebook como **Job** com frequência diária.
# MAGIC
# MAGIC 1. Vá em **Workflows → Create Job**
# MAGIC 2. Selecione este notebook
# MAGIC 3. Configure schedule: diariamente às 06:00 BRT
# MAGIC 4. Cluster: qualquer single-node (job compute)
