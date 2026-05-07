#!/usr/bin/env python3
"""
Replicação D-1: Salesforce tables logfood → pedro_zanela.tap (e2-demo-field-eng)
Roda localmente (sua máquina tem acesso a ambos os workspaces).

Schedule: launchd / cron - diariamente às 06:00 BRT
"""

import base64
import io
import logging
import sys
import time

import pyarrow as pa
import pyarrow.parquet as pq
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.sql import StatementState, Disposition, Format

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# Logfood: fonte dos dados Salesforce
LOGFOOD_HOST      = "https://adb-2548836972759138.18.azuredatabricks.net"
LOGFOOD_WAREHOUSE = "071969b1ec9a91ca"
LOGFOOD_PROFILE   = "logfood"

# e2: destino
E2_HOST      = "https://e2-demo-field-eng.cloud.databricks.com"
E2_WAREHOUSE = "e9b34f7a2e4b0561"
E2_PROFILE   = "DEFAULT"

TARGET_CATALOG = "pedro_zanela"
TARGET_SCHEMA  = "tap"
CHUNK_SIZE     = 512 * 1024  # 512KB


def sf_query_to_parquet(w: WorkspaceClient, sql: str) -> bytes:
    """Executa SQL no logfood e retorna bytes parquet via EXTERNAL_LINKS + Arrow."""
    import requests as req
    resp = w.statement_execution.execute_statement(
        warehouse_id=LOGFOOD_WAREHOUSE,
        statement=sql,
        wait_timeout="50s",
        disposition=Disposition.EXTERNAL_LINKS,
        format=Format.ARROW_STREAM,
    )
    max_wait, elapsed = 300, 0
    while resp.status.state in (StatementState.PENDING, StatementState.RUNNING):
        time.sleep(3)
        elapsed += 3
        if elapsed > max_wait:
            raise RuntimeError("Logfood SQL timeout")
        resp = w.statement_execution.get_statement(resp.statement_id)

    if resp.status.state == StatementState.FAILED:
        raise RuntimeError(f"Logfood SQL failed: {resp.status.error.message}")

    if not resp.result or not resp.result.external_links:
        return b""

    # Baixa e acumula Arrow IPC chunks
    tables = []
    links = resp.result.external_links
    while links:
        for link in links:
            arrow_bytes = req.get(link.external_link).content
            reader = pa.ipc.open_stream(arrow_bytes)
            tables.append(reader.read_all())
        last = links[-1]
        if last.next_chunk_index is None:
            break
        chunk = w.statement_execution.get_statement_result_chunk_n(resp.statement_id, last.next_chunk_index)
        links = chunk.external_links or []

    if not tables:
        return b""

    combined = pa.concat_tables(tables)
    buf = io.BytesIO()
    pq.write_table(combined, buf)
    return buf.getvalue()




def upload_to_e2_dbfs(w_e2: WorkspaceClient, data: bytes, dbfs_path: str):
    """Faz streaming upload para o DBFS do e2 via API."""
    import requests
    h = {"Authorization": f"Bearer {w_e2.config.token}"}
    base = f"{E2_HOST}/api/2.0/dbfs"

    r = requests.post(f"{base}/create", json={"path": dbfs_path, "overwrite": True}, headers=h)
    r.raise_for_status()
    handle = r.json()["handle"]

    for i in range(0, len(data), CHUNK_SIZE):
        chunk = data[i:i + CHUNK_SIZE]
        r = requests.post(f"{base}/add-block",
                          json={"handle": handle, "data": base64.b64encode(chunk).decode()},
                          headers=h)
        r.raise_for_status()

    requests.post(f"{base}/close", json={"handle": handle}, headers=h).raise_for_status()


def e2_exec(w_e2: WorkspaceClient, sql: str, timeout: int = 300):
    resp = w_e2.statement_execution.execute_statement(
        warehouse_id=E2_WAREHOUSE,
        statement=sql,
        wait_timeout="50s",
        disposition=Disposition.INLINE,
        format=Format.JSON_ARRAY,
    )
    elapsed = 0
    while resp.status.state in (StatementState.PENDING, StatementState.RUNNING):
        time.sleep(3)
        elapsed += 3
        if elapsed > timeout:
            raise RuntimeError("e2 SQL timeout")
        resp = w_e2.statement_execution.get_statement(resp.statement_id)
    if resp.status.state == StatementState.FAILED:
        raise RuntimeError(f"e2 SQL failed: {resp.status.error.message}")


def replicate(w_logfood: WorkspaceClient, w_e2: WorkspaceClient, name: str, sql: str):
    log.info(f"  [{name}] fetching...")
    data = sf_query_to_parquet(w_logfood, sql)

    if not data:
        log.warning(f"  [{name}] skipped - no data")
        return

    log.info(f"  [{name}] parquet size: {len(data)/1024/1024:.1f} MB")

    dbfs_path = f"/tmp/tap-replication/{name}.parquet"
    upload_to_e2_dbfs(w_e2, data, dbfs_path)
    log.info(f"  [{name}] uploaded to e2 DBFS")

    full_name = f"{TARGET_CATALOG}.{TARGET_SCHEMA}.{name}"
    e2_exec(w_e2, f"DROP TABLE IF EXISTS {full_name}")
    e2_exec(w_e2, f"CREATE TABLE {full_name} USING DELTA AS SELECT * FROM parquet.`dbfs:{dbfs_path}`")
    log.info(f"  [{name}] table created: {full_name}")


def main():
    log.info("=== TAP Map Salesforce Replication ===")

    w_logfood = WorkspaceClient(host=LOGFOOD_HOST, profile=LOGFOOD_PROFILE)
    w_e2 = WorkspaceClient(host=E2_HOST, profile=E2_PROFILE)

    e2_exec(w_e2, f"CREATE SCHEMA IF NOT EXISTS {TARGET_CATALOG}.{TARGET_SCHEMA}")

    replicate(w_logfood, w_e2, "core_accounts", """
        SELECT account_id, account_name, account_executive, vertical, sales_region,
               CAST(snapshot_date AS STRING) AS snapshot_date
        FROM main.it_sfdc_silver.core_accounts
        WHERE snapshot_date >= current_date() - INTERVAL 30 DAYS
    """)

    replicate(w_logfood, w_e2, "account_team_member", """
        SELECT account_id, combined_concatenated_emails, primary_sa_user_name, sa_user_name
        FROM main.gtm_silver.account_team_member
    """)

    replicate(w_logfood, w_e2, "core_opportunity", """
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
    """)

    replicate(w_logfood, w_e2, "individual_hierarchy_workday", """
        SELECT email, manager_name, manager_email, manager_title,
               CAST(snapshot_date AS STRING) AS snapshot_date
        FROM main.gtm_silver.individual_hierarchy_workday
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM main.gtm_silver.individual_hierarchy_workday)
    """)

    log.info("=== Replicação concluída! ===")


if __name__ == "__main__":
    main()
