"""Salesforce account data and user identity queries."""

import logging
import time
from typing import Any

from databricks.sdk.service.sql import StatementState

from server.config import get_workspace_client, WAREHOUSE_ID

logger = logging.getLogger(__name__)

# Replicated tables in pedro_zanela.tap (e2-demo-field-eng)
ACCOUNTS_TABLE  = "pedro_zanela.tap.core_accounts"
TEAM_TABLE      = "pedro_zanela.tap.account_team_member"
OPP_TABLE       = "pedro_zanela.tap.core_opportunity"
ORG_HIER_TABLE  = "pedro_zanela.tap.individual_hierarchy_workday"


def _sf_execute(sql: str) -> list[dict[str, Any]]:
    """Execute SQL against the e2 serverless warehouse."""
    w = get_workspace_client()
    resp = w.statement_execution.execute_statement(
        warehouse_id=WAREHOUSE_ID,
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
            raise RuntimeError("SQL timed out")
        resp = w.statement_execution.get_statement(resp.statement_id)

    if resp.status and resp.status.state == StatementState.FAILED:
        msg = resp.status.error.message if resp.status.error else "Unknown error"
        raise RuntimeError(f"SQL failed: {msg}")

    if not resp.manifest or not resp.result or not resp.result.data_array:
        return []

    columns = [col.name for col in resp.manifest.schema.columns]
    return [dict(zip(columns, row)) for row in resp.result.data_array]


def get_current_user() -> dict:
    """Return display_name, email and user_id of the authenticated user."""
    try:
        w = get_workspace_client()
        me = w.current_user.me()
        return {
            "email":        me.user_name or "",
            "display_name": me.display_name or "",
            "user_id":      str(me.id or ""),
        }
    except Exception as e:
        logger.warning(f"Could not get current user: {e}")
        return {"email": "", "display_name": "", "user_id": ""}


def get_sa_accounts(user_display_name: str, user_email: str) -> list[dict]:
    """Return accounts where the current user is a Solution Architect."""
    conditions = []

    if user_email:
        safe_email = user_email.lower().replace("'", "''")
        conditions.append(
            f"LOWER(atm.combined_concatenated_emails) LIKE '%{safe_email}%'"
        )

    if user_display_name:
        safe_name = user_display_name.replace("'", "''").lower()
        conditions.append(f"LOWER(atm.primary_sa_user_name) LIKE '%{safe_name}%'")
        conditions.append(f"LOWER(atm.sa_user_name) LIKE '%{safe_name}%'")

    if not conditions:
        return []

    where = " OR ".join(conditions)
    sql = f"""
    WITH latest_accounts AS (
        SELECT account_id, account_name, account_executive, vertical, sales_region
        FROM {ACCOUNTS_TABLE}
        WHERE snapshot_date >= current_date() - INTERVAL 7 DAYS
    )
    SELECT DISTINCT
        la.account_name                        AS customer_name,
        la.account_id,
        COALESCE(la.account_executive, '')     AS account_executive,
        COALESCE(la.vertical, '')              AS industry,
        COALESCE(la.sales_region, '')          AS region
    FROM latest_accounts la
    JOIN {TEAM_TABLE} atm ON la.account_id = atm.account_id
    WHERE ({where})
    ORDER BY customer_name
    LIMIT 300
    """
    try:
        return _sf_execute(sql)
    except Exception as e:
        logger.warning(f"Could not query SA accounts: {e}")
        return []


def get_account_spend(account_name: str) -> dict:
    """Return Databricks contract/spend data for a customer account."""
    safe = account_name.replace("'", "''")
    sql = f"""
    WITH la AS (
        SELECT account_id, account_name
        FROM {ACCOUNTS_TABLE}
        WHERE snapshot_date >= current_date() - INTERVAL 7 DAYS
          AND LOWER(account_name) LIKE '%{safe.lower()}%'
    )
    SELECT
        COALESCE(o.total_price, 0)            AS total_value,
        COALESCE(o.opportunity_type, '')       AS commitment_type,
        COALESCE(o.opportunity_status, '')     AS status,
        CAST(o.start_date AS STRING)           AS start_date,
        CAST(o.end_date   AS STRING)           AS end_date
    FROM la
    JOIN {OPP_TABLE} o ON la.account_id = o.account_id
    ORDER BY o.start_date DESC
    LIMIT 50
    """
    try:
        rows = _sf_execute(sql)
        total = sum(float(r.get("total_value") or 0) for r in rows)
        return {
            "total_value":     total,
            "commitment_type": rows[0].get("commitment_type", "") if rows else "",
            "contracts":       rows,
        }
    except Exception as e:
        logger.warning(f"Could not query account spend: {e}")
        return {"total_value": 0, "commitment_type": "", "contracts": []}


def get_manager(employee_email: str) -> dict:
    """Return direct manager info for a Databricks employee via Workday org hierarchy."""
    safe_email = employee_email.lower().replace("'", "''")
    sql = f"""
    SELECT manager_name, manager_email, manager_title
    FROM {ORG_HIER_TABLE}
    WHERE LOWER(email) = '{safe_email}'
      AND snapshot_date = (SELECT MAX(snapshot_date) FROM {ORG_HIER_TABLE})
    LIMIT 1
    """
    try:
        rows = _sf_execute(sql)
        if not rows:
            return {"manager_email": "", "manager_name": "", "manager_title": ""}
        return {
            "manager_email": rows[0].get("manager_email") or "",
            "manager_name":  rows[0].get("manager_name")  or "",
            "manager_title": rows[0].get("manager_title") or "",
        }
    except Exception as e:
        logger.warning(f"Could not query manager for {employee_email}: {e}")
        return {"manager_email": "", "manager_name": "", "manager_title": ""}
