# Databricks notebook source

# MAGIC %md
# MAGIC # TAP Map Builder — Setup Secrets
# MAGIC
# MAGIC Este notebook cria os secrets necessários para o envio automático de emails do TAP Map Builder.
# MAGIC
# MAGIC **Pré-requisitos:**
# MAGIC - Conta Gmail com [2-Step Verification](https://myaccount.google.com/security) ativada
# MAGIC - [App Password](https://myaccount.google.com/apppasswords) gerada para a conta Gmail

# COMMAND ----------

# MAGIC %md
# MAGIC ## Configuração — edite os valores abaixo

# COMMAND ----------

# Scope name — altere conforme seu ambiente
SECRET_SCOPE = "minha-scope"

# Gmail credentials
GMAIL_SENDER = "seu-email@gmail.com"
GMAIL_APP_PASSWORD = "xxxx-xxxx-xxxx-xxxx"

# COMMAND ----------

# MAGIC %md
# MAGIC ## Execução — rode as células abaixo (não precisa alterar nada)

# COMMAND ----------

from databricks.sdk import WorkspaceClient

w = WorkspaceClient()

# Criar scope (ignora se já existir)
try:
    w.secrets.create_scope(scope=SECRET_SCOPE)
    print(f"✅ Scope '{SECRET_SCOPE}' criada")
except Exception as e:
    if "RESOURCE_ALREADY_EXISTS" in str(e):
        print(f"⚠️ Scope '{SECRET_SCOPE}' já existe (OK)")
    else:
        raise e

# COMMAND ----------

import base64

# Salvar secrets
w.secrets.put_secret(scope=SECRET_SCOPE, key="tap-map-gmail-sender", string_value=GMAIL_SENDER)
print(f"✅ Secret 'tap-map-gmail-sender' salvo")

w.secrets.put_secret(scope=SECRET_SCOPE, key="tap-map-gmail-password", string_value=GMAIL_APP_PASSWORD)
print(f"✅ Secret 'tap-map-gmail-password' salvo")

# COMMAND ----------

# Verificação
secrets = w.secrets.list_secrets(scope=SECRET_SCOPE)
print(f"\n📋 Secrets na scope '{SECRET_SCOPE}':")
for s in secrets:
    print(f"   🔑 {s.key}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## Próximos passos
# MAGIC
# MAGIC 1. Atualize a variável `secret_scope` no `databricks.yml` com o valor de `SECRET_SCOPE` acima
# MAGIC 2. Rode `databricks bundle deploy` para deployar o app
# MAGIC 3. **Apague os valores de `GMAIL_SENDER` e `GMAIL_APP_PASSWORD` desta célula** após a execução
