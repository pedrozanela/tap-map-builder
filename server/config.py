"""Configuration and authentication for dual-mode (local / Databricks App)."""

import os
from databricks.sdk import WorkspaceClient

IS_DATABRICKS_APP = bool(os.environ.get("DATABRICKS_APP_NAME"))

# Warehouse for all queries (injected from app resource, serverless in prod)
WAREHOUSE_ID = os.environ.get("DATABRICKS_WAREHOUSE_ID", "862f1d757f0424f7")

# Catalog and schema (configurable per workspace)
CATALOG = os.environ.get("TAP_CATALOG", "pedro_zanela")
SCHEMA  = os.environ.get("TAP_SCHEMA",  "tap")
TABLE           = "tap_maps"
FULL_TABLE_NAME = f"{CATALOG}.{SCHEMA}.{TABLE}"
METADATA_TABLE  = f"{CATALOG}.{SCHEMA}.tap_account_metadata"
AUDIT_TABLE     = f"{CATALOG}.{SCHEMA}.tap_maps_audit"


def get_workspace_client() -> WorkspaceClient:
    """Get WorkspaceClient - auto-configures from env in Databricks Apps,
    uses DEFAULT profile locally."""
    if IS_DATABRICKS_APP:
        return WorkspaceClient()
    profile = os.environ.get("DATABRICKS_PROFILE", "DEFAULT")
    return WorkspaceClient(profile=profile)
