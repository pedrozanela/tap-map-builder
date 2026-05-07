"""TAP Map approval workflow — DB operations and email notifications."""

import logging
import os
import smtplib
import uuid
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


from server.config import CATALOG, SCHEMA
from server.db import _execute_sql

logger = logging.getLogger(__name__)

APPROVAL_TABLE = f"{CATALOG}.{SCHEMA}.tap_map_approvals"

CREATE_APPROVAL_TABLE_SQL = f"""
CREATE TABLE IF NOT EXISTS {APPROVAL_TABLE} (
    account_name    STRING NOT NULL,
    status          STRING NOT NULL,
    submitted_by    STRING,
    submitted_at    TIMESTAMP,
    manager_email   STRING,
    reviewer_email  STRING,
    reviewed_at     TIMESTAMP,
    comments        STRING,
    approval_token  STRING,
    submission_count INT,
    updated_at      TIMESTAMP
)
USING DELTA
TBLPROPERTIES ('delta.columnMapping.mode' = 'name')
"""

def _get_app_base_url() -> str:
    return os.environ.get("APP_BASE_URL", os.environ.get("DATABRICKS_APP_URL", "http://localhost:8000"))


def init_approval_table():
    try:
        _execute_sql(CREATE_APPROVAL_TABLE_SQL)
        print(f"Table {APPROVAL_TABLE} ready.")
    except Exception as e:
        print(f"Warning: Could not create approval table: {e}")


def get_approval(account_name: str) -> Optional[dict]:
    safe = account_name.replace("'", "''")
    rows = _execute_sql(
        f"SELECT account_name, status, submitted_by, submitted_at, manager_email, "
        f"reviewer_email, reviewed_at, comments, approval_token, submission_count, updated_at "
        f"FROM {APPROVAL_TABLE} WHERE account_name = '{safe}' LIMIT 1"
    )
    if not rows:
        return None
    row = rows[0]
    # Normalize timestamp fields to string
    for f in ("submitted_at", "reviewed_at", "updated_at"):
        if row.get(f):
            row[f] = str(row[f])
    return row


def get_approval_by_token(token: str) -> Optional[dict]:
    safe = token.replace("'", "''")
    rows = _execute_sql(
        f"SELECT account_name, status, submitted_by, submitted_at, manager_email, "
        f"reviewer_email, reviewed_at, comments, approval_token, submission_count "
        f"FROM {APPROVAL_TABLE} WHERE approval_token = '{safe}' LIMIT 1"
    )
    if not rows:
        return None
    row = rows[0]
    for f in ("submitted_at", "reviewed_at"):
        if row.get(f):
            row[f] = str(row[f])
    return row


def submit_for_approval(account_name: str, submitted_by: str, manager_email: str) -> str:
    """Create or reset approval record → pending. Returns new token."""
    token = str(uuid.uuid4())
    safe_account = account_name.replace("'", "''")
    safe_by      = submitted_by.replace("'", "''")
    safe_mgr     = manager_email.replace("'", "''")

    existing = get_approval(account_name)
    new_count = (int(existing.get("submission_count") or 0) + 1) if existing else 1

    if existing:
        _execute_sql(f"""
        UPDATE {APPROVAL_TABLE}
        SET status           = 'pending',
            submitted_by     = '{safe_by}',
            submitted_at     = current_timestamp(),
            manager_email    = '{safe_mgr}',
            reviewer_email   = NULL,
            reviewed_at      = NULL,
            comments         = NULL,
            approval_token   = '{token}',
            submission_count = {new_count},
            updated_at       = current_timestamp()
        WHERE account_name = '{safe_account}'
        """)
    else:
        _execute_sql(f"""
        INSERT INTO {APPROVAL_TABLE}
            (account_name, status, submitted_by, submitted_at, manager_email,
             reviewer_email, reviewed_at, comments, approval_token, submission_count, updated_at)
        VALUES
            ('{safe_account}', 'pending', '{safe_by}', current_timestamp(), '{safe_mgr}',
             NULL, NULL, NULL, '{token}', {new_count}, current_timestamp())
        """)
    return token


def reset_approval_to_draft(account_name: str):
    """Reset approval status to draft when TAP is updated after approval."""
    existing = get_approval(account_name)
    if not existing or existing.get("status") == "draft":
        return
    safe = account_name.replace("'", "''")
    _execute_sql(f"""
    UPDATE {APPROVAL_TABLE}
    SET status     = 'draft',
        updated_at = current_timestamp()
    WHERE account_name = '{safe}'
    """)


def delete_approval(account_name: str):
    """Delete all approval records for an account."""
    safe = account_name.replace("'", "''")
    _execute_sql(f"DELETE FROM {APPROVAL_TABLE} WHERE account_name = '{safe}'")


def approve_tap(token: str, reviewer_email: str) -> dict:
    """Approve a TAP Map. Returns the approval record."""
    approval = get_approval_by_token(token)
    if not approval:
        raise ValueError("Token inválido ou expirado.")
    if approval["status"] != "pending":
        raise ValueError(f"Este TAP não está aguardando aprovação (status: {approval['status']}).")

    safe_token    = token.replace("'", "''")
    safe_reviewer = reviewer_email.replace("'", "''")

    _execute_sql(f"""
    UPDATE {APPROVAL_TABLE}
    SET status         = 'approved',
        reviewer_email = '{safe_reviewer}',
        reviewed_at    = current_timestamp(),
        updated_at     = current_timestamp()
    WHERE approval_token = '{safe_token}'
    """)
    approval["status"]         = "approved"
    approval["reviewer_email"] = reviewer_email
    return approval


def reject_tap(token: str, reviewer_email: str, comments: str) -> dict:
    """Reject a TAP Map with comments. Returns the approval record."""
    approval = get_approval_by_token(token)
    if not approval:
        raise ValueError("Token inválido ou expirado.")
    if approval["status"] != "pending":
        raise ValueError(f"Este TAP não está aguardando aprovação (status: {approval['status']}).")

    safe_token    = token.replace("'", "''")
    safe_reviewer = reviewer_email.replace("'", "''")
    safe_comments = comments.replace("'", "''")

    _execute_sql(f"""
    UPDATE {APPROVAL_TABLE}
    SET status         = 'rejected',
        reviewer_email = '{safe_reviewer}',
        reviewed_at    = current_timestamp(),
        comments       = '{safe_comments}',
        updated_at     = current_timestamp()
    WHERE approval_token = '{safe_token}'
    """)
    approval["status"]         = "rejected"
    approval["reviewer_email"] = reviewer_email
    approval["comments"]       = comments
    return approval


# ── Gmail ─────────────────────────────────────────────────────────────────────

def _get_gmail_creds() -> tuple[str, str]:
    """Get Gmail credentials from env vars or Databricks Secrets SDK."""
    import base64
    sender   = os.environ.get("GMAIL_SENDER", "")
    password = os.environ.get("GMAIL_APP_PASSWORD", "")
    if sender and password:
        return sender, password
    # Fallback: read directly via SDK (for Databricks Apps where valueFrom may not inject)
    try:
        from server.config import get_workspace_client
        w = get_workspace_client()
        s = w.secrets.get_secret(scope="pedro-zanela-scope", key="tap-map-gmail-sender")
        p = w.secrets.get_secret(scope="pedro-zanela-scope", key="tap-map-gmail-password")
        sender   = base64.b64decode(s.value).decode() if s.value else ""
        password = base64.b64decode(p.value).decode() if p.value else ""
    except Exception as e:
        logger.warning(f"[email] Could not read Gmail secrets via SDK: {e}")
    return sender, password


def _send_email(to_email: str, subject: str, html_body: str):
    """Send an HTML email via Gmail SMTP."""
    sender, password = _get_gmail_creds()
    print(f"[email] sender={repr(sender)} password_len={len(password)} to={to_email}")
    if not sender or not password:
        logger.warning("[email] Gmail credentials not available — skipping email")
        return
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"TAP Map Builder <{sender}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(sender, password)
            server.sendmail(sender, to_email, msg.as_string())
        logger.info(f"[email] Sent to {to_email}: {subject}")
        print(f"[email] Sent OK to {to_email}")
    except Exception as e:
        logger.error(f"[email] Failed to send to {to_email}: {e}")
        print(f"[email] ERROR sending to {to_email}: {e}")


def send_review_request(manager_email: str, account_name: str,
                         submitted_by: str, token: str):
    review_url = f"{_get_app_base_url()}/?review_token={token}"
    subject = f"[TAP Map] Revisão Solicitada — {account_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #FF3621; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">TAP Map — Revisão Solicitada</h2>
      </div>
      <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p><strong>{submitted_by}</strong> submeteu um TAP Map para sua revisão:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; background: #f5f5f5; font-weight: bold; width: 40%;">Cliente</td>
            <td style="padding: 8px; background: #f5f5f5;">{account_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Submetido por</td>
            <td style="padding: 8px;">{submitted_by}</td>
          </tr>
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{review_url}"
             style="background: #FF3621; color: white; padding: 12px 28px; border-radius: 6px;
                    text-decoration: none; font-weight: bold; font-size: 16px;">
            Revisar TAP Map →
          </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center;">
          Databricks Field Engineering · TAP Map Builder
        </p>
      </div>
    </div>
    """
    _send_email(manager_email, subject, html_body)


def send_approval_decision(sa_email: str, account_name: str, status: str,
                            reviewer_email: str, comments: str = ""):
    if status == "approved":
        status_label = "Aprovado ✅"
        status_color = "#2e7d32"
        status_text  = f"Aprovado por {reviewer_email}"
        comments_html = ""
    else:
        status_label = "Revisão Solicitada ❌"
        status_color = "#c62828"
        status_text  = f"Rejeitado por {reviewer_email}"
        comments_html = (
            f'<tr><td style="padding: 8px; font-weight: bold;">Comentários</td>'
            f'<td style="padding: 8px;">{comments}</td></tr>'
        ) if comments else ""

    subject = f"[TAP Map] {status_label} — {account_name}"
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: {status_color}; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="color: white; margin: 0;">TAP Map — {status_label}</h2>
      </div>
      <div style="border: 1px solid #ddd; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; background: #f5f5f5; font-weight: bold; width: 40%;">Cliente</td>
            <td style="padding: 8px; background: #f5f5f5;">{account_name}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Status</td>
            <td style="padding: 8px; color: {status_color}; font-weight: bold;">{status_text}</td>
          </tr>
          {comments_html}
        </table>
        <div style="text-align: center; margin: 24px 0;">
          <a href="{_get_app_base_url()}/"
             style="background: #FF3621; color: white; padding: 12px 28px; border-radius: 6px;
                    text-decoration: none; font-weight: bold; font-size: 16px;">
            Abrir TAP Map Builder →
          </a>
        </div>
        <p style="color: #888; font-size: 12px; text-align: center;">
          Databricks Field Engineering · TAP Map Builder
        </p>
      </div>
    </div>
    """
    _send_email(sa_email, subject, html_body)
