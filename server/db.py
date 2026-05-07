"""Database operations using Databricks SQL Statement Execution API."""

import json
import time
from typing import Any, Optional

from databricks.sdk.service.sql import StatementState

from server.config import FULL_TABLE_NAME, METADATA_TABLE, AUDIT_TABLE, WAREHOUSE_ID, get_workspace_client

CREATE_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {FULL_TABLE_NAME} (
    account_name STRING NOT NULL,
    section STRING NOT NULL,
    subsection STRING NOT NULL,
    tools_in_use STRING,
    primary_tool STRING,
    exec_buyer STRING,
    budget STRING,
    notes STRING,
    not_applicable BOOLEAN,
    created_at TIMESTAMP,
    created_by STRING,
    updated_at TIMESTAMP,
    updated_by STRING
)
USING DELTA
TBLPROPERTIES ('delta.columnMapping.mode' = 'name')
"""

CREATE_METADATA_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {METADATA_TABLE} (
    account_name STRING NOT NULL,
    responsible STRING,
    consulted STRING,
    informed STRING,
    created_at TIMESTAMP,
    created_by STRING,
    updated_at TIMESTAMP,
    updated_by STRING
)
USING DELTA
TBLPROPERTIES ('delta.columnMapping.mode' = 'name')
"""

CREATE_AUDIT_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {AUDIT_TABLE} (
    account_name STRING NOT NULL,
    section STRING,
    subsection STRING,
    action STRING NOT NULL,
    changed_by STRING,
    changed_at TIMESTAMP,
    old_value STRING,
    new_value STRING
)
USING DELTA
TBLPROPERTIES ('delta.columnMapping.mode' = 'name')
"""


def _execute_sql(sql: str, warehouse_id: str = None) -> list[dict[str, Any]]:
    """Execute SQL and return rows as list of dicts."""
    wh = warehouse_id or WAREHOUSE_ID
    w = get_workspace_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=wh,
        statement=sql,
        wait_timeout="50s",
    )

    max_wait = 120
    elapsed = 0
    while resp.status and resp.status.state in (
        StatementState.PENDING,
        StatementState.RUNNING,
    ):
        time.sleep(2)
        elapsed += 2
        if elapsed > max_wait:
            raise RuntimeError("SQL statement timed out after 120s")
        resp = w.statement_execution.get_statement(resp.statement_id)

    if resp.status and resp.status.state == StatementState.FAILED:
        error_msg = resp.status.error.message if resp.status.error else "Unknown SQL error"
        raise RuntimeError(f"SQL execution failed: {error_msg}")

    if not resp.manifest or not resp.result or not resp.result.data_array:
        return []

    columns = [col.name for col in resp.manifest.schema.columns]
    return [dict(zip(columns, row)) for row in resp.result.data_array]


def init_table():
    """Create tables and migrate schema if needed."""
    for sql, name in [
        (CREATE_TABLE_SQL, FULL_TABLE_NAME),
        (CREATE_METADATA_TABLE_SQL, METADATA_TABLE),
        (CREATE_AUDIT_TABLE_SQL, AUDIT_TABLE),
    ]:
        try:
            _execute_sql(sql)
            print(f"Table {name} ready.")
        except Exception as e:
            print(f"Warning: Could not create table {name}: {e}")

    # Migrate: add columns if missing
    for col_def in ("budget STRING", "primary_tool STRING",
                    "created_at TIMESTAMP", "created_by STRING", "updated_by STRING"):
        try:
            _execute_sql(f"ALTER TABLE {FULL_TABLE_NAME} ADD COLUMN {col_def}")
        except Exception:
            pass

    for col_def in ("created_at TIMESTAMP", "created_by STRING", "updated_by STRING"):
        try:
            _execute_sql(f"ALTER TABLE {METADATA_TABLE} ADD COLUMN {col_def}")
        except Exception:
            pass

    # Migrate: drop old RACI columns from tap_maps if they exist
    for col in ("responsible", "consulted", "informed"):
        try:
            _execute_sql(f"ALTER TABLE {FULL_TABLE_NAME} DROP COLUMN {col}")
        except Exception:
            pass


def list_accounts(created_by: str = "") -> list[dict]:
    where = ""
    if created_by:
        safe_user = created_by.replace("'", "''")
        where = f"WHERE COALESCE(NULLIF(created_by, ''), updated_by) = '{safe_user}'"
    sql = f"""
    SELECT account_name,
           MAX(updated_at) as last_updated,
           MAX(updated_by) as last_updated_by,
           COUNT(DISTINCT subsection) as sections_filled
    FROM {FULL_TABLE_NAME}
    {where}
    GROUP BY account_name
    ORDER BY MAX(updated_at) DESC
    """
    return _execute_sql(sql)


def list_all_accounts() -> list[dict]:
    sql = f"""
    WITH tap_summary AS (
        SELECT account_name,
               MAX(updated_at)       AS last_updated,
               MAX(updated_by)       AS last_updated_by,
               MAX(created_by)       AS created_by,
               COUNT(DISTINCT subsection) AS sections_filled
        FROM {FULL_TABLE_NAME}
        GROUP BY account_name
    ),
    latest_hierarchy AS (
        SELECT email, manager_name
        FROM pedro_zanela.tap.individual_hierarchy_workday
        WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM pedro_zanela.tap.individual_hierarchy_workday)
    )
    SELECT ts.account_name,
           ts.last_updated,
           ts.last_updated_by,
           ts.created_by,
           ts.sections_filled,
           lh.manager_name
    FROM tap_summary ts
    LEFT JOIN latest_hierarchy lh
      ON LOWER(lh.email) = LOWER(COALESCE(NULLIF(ts.created_by, ''), ts.last_updated_by))
    ORDER BY ts.last_updated DESC
    """
    return _execute_sql(sql)


def get_tap_map(account_name: str) -> list[dict]:
    safe_name = account_name.replace("'", "''")
    sql = f"""
    SELECT section, subsection, tools_in_use, primary_tool,
           exec_buyer, budget, notes, not_applicable,
           created_at, created_by, updated_at, updated_by
    FROM {FULL_TABLE_NAME}
    WHERE account_name = '{safe_name}'
    ORDER BY section, subsection
    """
    return _execute_sql(sql)


def _write_audit_records(account_name: str, entries: list[dict],
                          old_rows: dict, action_type: str, changed_by: str):
    """Insert audit records for a batch of changes."""
    if not entries:
        return

    safe_account = account_name.replace("'", "''")
    safe_user = changed_by.replace("'", "''")

    audit_rows = []
    for e in entries:
        key = (e.get("section", ""), e.get("subsection", ""))
        old = old_rows.get(key)
        action = action_type if action_type == "DELETE" else ("UPDATE" if old else "INSERT")

        old_json = json.dumps(old, default=str) if old else "null"
        new_json = "null" if action_type == "DELETE" else json.dumps(
            {k: v for k, v in e.items()}, default=str
        )

        safe_section = (e.get("section") or "").replace("'", "''")
        safe_sub = (e.get("subsection") or "").replace("'", "''")
        safe_old = old_json.replace("'", "''")
        safe_new = new_json.replace("'", "''")

        audit_rows.append(
            f"('{safe_account}', '{safe_section}', '{safe_sub}', "
            f"'{action}', '{safe_user}', current_timestamp(), "
            f"'{safe_old}', '{safe_new}')"
        )

    if not audit_rows:
        return

    values_sql = ",\n".join(audit_rows)
    insert_sql = f"""
    INSERT INTO {AUDIT_TABLE}
        (account_name, section, subsection, action, changed_by, changed_at, old_value, new_value)
    VALUES {values_sql}
    """
    try:
        _execute_sql(insert_sql)
    except Exception as e:
        print(f"Warning: Could not write audit records: {e}")


def upsert_tap_map(account_name: str, entries: list[dict], updated_by: str = ""):
    """Upsert TAP map entries for an account, with full audit trail."""
    if not entries:
        return

    # Snapshot old rows for audit comparison
    old_rows = {(r["section"], r["subsection"]): r for r in get_tap_map(account_name)}

    safe_account = account_name.replace("'", "''")
    safe_user = updated_by.replace("'", "''")

    value_rows = []
    for e in entries:
        tools = json.dumps(e.get("tools_in_use", []))
        safe_tools   = tools.replace("'", "''")
        safe_primary = (e.get("primary_tool") or "").replace("'", "''")
        safe_exec    = (e.get("exec_buyer") or "").replace("'", "''")
        safe_budget  = (e.get("budget") or "").replace("'", "''")
        safe_notes   = (e.get("notes") or "").replace("'", "''")
        safe_section = (e.get("section") or "").replace("'", "''")
        safe_sub     = (e.get("subsection") or "").replace("'", "''")
        na = "true" if e.get("not_applicable") else "false"

        value_rows.append(
            f"('{safe_account}', '{safe_section}', '{safe_sub}', "
            f"'{safe_tools}', '{safe_primary}', '{safe_exec}', '{safe_budget}', "
            f"'{safe_notes}', {na}, '{safe_user}')"
        )

    values_sql = ",\n".join(value_rows)

    merge_sql = f"""
    MERGE INTO {FULL_TABLE_NAME} AS target
    USING (
        SELECT * FROM (VALUES
            {values_sql}
        ) AS source(account_name, section, subsection, tools_in_use, primary_tool,
                     exec_buyer, budget, notes, not_applicable, updated_by)
    ) AS source
    ON target.account_name = source.account_name
       AND target.section = source.section
       AND target.subsection = source.subsection
    WHEN MATCHED THEN UPDATE SET
        target.tools_in_use = source.tools_in_use,
        target.primary_tool = source.primary_tool,
        target.exec_buyer   = source.exec_buyer,
        target.budget       = source.budget,
        target.notes        = source.notes,
        target.not_applicable = source.not_applicable,
        target.updated_by   = source.updated_by,
        target.updated_at   = current_timestamp()
    WHEN NOT MATCHED THEN INSERT (
        account_name, section, subsection, tools_in_use, primary_tool,
        exec_buyer, budget, notes, not_applicable,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        source.account_name, source.section, source.subsection, source.tools_in_use, source.primary_tool,
        source.exec_buyer, source.budget, source.notes, source.not_applicable,
        current_timestamp(), source.updated_by, current_timestamp(), source.updated_by
    )
    """
    _execute_sql(merge_sql)

    _write_audit_records(account_name, entries, old_rows, "UPSERT", updated_by)


def delete_tap_map(account_name: str, deleted_by: str = ""):
    """Delete all entries for an account and log to audit."""
    old_rows_list = get_tap_map(account_name)
    old_rows = {(r["section"], r["subsection"]): r for r in old_rows_list}

    safe_name = account_name.replace("'", "''")
    _execute_sql(f"DELETE FROM {FULL_TABLE_NAME} WHERE account_name = '{safe_name}'")
    _execute_sql(f"DELETE FROM {METADATA_TABLE} WHERE account_name = '{safe_name}'")

    if old_rows_list:
        _write_audit_records(account_name, old_rows_list, old_rows, "DELETE", deleted_by)


# ── Account-level RACI metadata ──────────────────────────────────────────────

def get_account_metadata(account_name: str) -> dict:
    safe = account_name.replace("'", "''")
    rows = _execute_sql(
        f"SELECT responsible, consulted, informed, created_by, updated_by, updated_at "
        f"FROM {METADATA_TABLE} "
        f"WHERE account_name = '{safe}' LIMIT 1"
    )
    empty = {"responsible": [], "consulted": [], "informed": []}
    if not rows:
        return empty
    row = rows[0]
    result = {}
    for field in ("responsible", "consulted", "informed"):
        val = row.get(field) or "[]"
        try:
            parsed = json.loads(val)
            result[field] = parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            result[field] = []
    return result


def upsert_account_metadata(account_name: str, responsible: list, consulted: list,
                             informed: list, updated_by: str = ""):
    safe_acc  = account_name.replace("'", "''")
    safe_resp = json.dumps(responsible).replace("'", "''")
    safe_cons = json.dumps(consulted).replace("'", "''")
    safe_inf  = json.dumps(informed).replace("'", "''")
    safe_user = updated_by.replace("'", "''")

    merge_sql = f"""
    MERGE INTO {METADATA_TABLE} AS target
    USING (
        SELECT '{safe_acc}' AS account_name,
               '{safe_resp}' AS responsible,
               '{safe_cons}' AS consulted,
               '{safe_inf}'  AS informed,
               '{safe_user}' AS updated_by,
               current_timestamp() AS updated_at
    ) AS source
    ON target.account_name = source.account_name
    WHEN MATCHED THEN UPDATE SET
        target.responsible = source.responsible,
        target.consulted   = source.consulted,
        target.informed    = source.informed,
        target.updated_by  = source.updated_by,
        target.updated_at  = source.updated_at
    WHEN NOT MATCHED THEN INSERT (
        account_name, responsible, consulted, informed,
        created_at, created_by, updated_at, updated_by
    ) VALUES (
        source.account_name, source.responsible, source.consulted, source.informed,
        current_timestamp(), source.updated_by, current_timestamp(), source.updated_by
    )
    """
    _execute_sql(merge_sql)

    # Audit
    old_entry = get_account_metadata(account_name)
    new_entry = {"responsible": responsible, "consulted": consulted, "informed": informed}
    safe_old = json.dumps(old_entry).replace("'", "''")
    safe_new = json.dumps(new_entry).replace("'", "''")
    action = "UPDATE" if old_entry.get("responsible") or old_entry.get("consulted") or old_entry.get("informed") else "INSERT"
    try:
        _execute_sql(
            f"INSERT INTO {AUDIT_TABLE} "
            f"(account_name, section, subsection, action, changed_by, changed_at, old_value, new_value) "
            f"VALUES ('{safe_acc}', 'METADATA', 'RACI', '{action}', '{safe_user}', "
            f"current_timestamp(), '{safe_old}', '{safe_new}')"
        )
    except Exception as e:
        print(f"Warning: Could not write metadata audit: {e}")
