# TAP Map Builder

**TAM, Architecture, Powerbase mapping for customer accounts**

A full-stack Databricks App that enables Solution Architects to map their customers' technology landscape across data, AI, BI, governance, and enterprise tool categories — then submit for manager approval via automated email workflow.

![Databricks App](https://img.shields.io/badge/Databricks-App-FF3621?logo=databricks&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

---

## Overview

TAP Map Builder provides a structured visual interface for SAs to document the tools and technologies each customer uses across key platform categories:

| Category | Subsections |
|----------|-------------|
| **Abstraction Layer (ETL)** | Ingest & Transform |
| **Machine Learning / AI** | DS/ML, GenAI & Agents |
| **Business Intelligence** | Data Warehouse, BI Tool |
| **Serving** | Model Serving, Database, Application, Data Sharing |
| **Enterprise Tools** | CRM, Customer Support, Docs |
| **Data Governance** | Data Governance |
| **Cloud Storage / Format** | Cloud Storage / Format |

Each subsection tracks:
- **Tools in use** (with vendor logos and color-coded Databricks presence indicators)
- **Primary tool** designation
- **Executive buyer** and **budget**
- **Notes / observations**
- **Account-level RACI** (Responsible, Consulted, Informed)

## Features

- **Two-tab list view** — "My TAP Maps" (editable) and "All TAP Maps" (read-only, filterable by Manager and SA)
- **Visual tool mapping** — drag-and-drop tool selection with 100+ pre-configured vendor tools and logos
- **Color-coded status** — red (no Databricks), yellow (Databricks present), green (Databricks primary)
- **Approval workflow** — submit for manager review with automatic email notification via Gmail SMTP
- **Role-based review access** — only the designated manager can view and approve/reject via secure token link
- **Approval status tracking** — Approved, Pending, Rejected, or Draft status with banners on all views
- **Salesforce integration** — account list pulled from SFDC, with contract spend data (ARR, commitment type)
- **Print-ready layout** — optimized CSS for printing TAP Maps
- **Audit trail** — all changes logged with user identity and timestamps

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Databricks App                      │
│                                                      │
│  ┌──────────────┐         ┌───────────────────────┐  │
│  │   React +    │  REST   │   FastAPI (Python)     │  │
│  │   Tailwind   │◄──────►│                         │  │
│  │   TypeScript  │   API   │  ├─ server/db.py       │  │
│  └──────────────┘         │  ├─ server/approval.py  │  │
│                            │  ├─ server/salesforce.py│  │
│                            │  └─ server/config.py    │  │
│                            └──────────┬────────────┘  │
│                                       │               │
└───────────────────────────────────────┼───────────────┘
                                        │
                    ┌───────────────────┼──────────────────┐
                    │                   ▼                   │
                    │        Unity Catalog (Delta)          │
                    │   <catalog>.<schema>                  │
                    │                                       │
                    │   Tabelas do app (auto-criadas):      │
                    │   ├─ tap_maps                         │
                    │   ├─ tap_account_metadata             │
                    │   ├─ tap_maps_audit                   │
                    │   └─ tap_map_approvals                │
                    │                                       │
                    │   Tabelas replicadas (Salesforce):    │
                    │   ├─ core_accounts                    │
                    │   ├─ account_team_member              │
                    │   ├─ core_opportunity                 │
                    │   └─ individual_hierarchy_workday     │
                    │                                       │
                    │        Secrets                         │
                    │   <scope>                              │
                    │   ├─ tap-map-gmail-sender              │
                    │   ├─ tap-map-gmail-password            │
                    │   └─ logfood-pat                       │
                    │                                       │
                    │        SQL Warehouse                   │
                    └───────────────────────────────────────┘
```

## Project Structure

```
tap-map-builder/
├── databricks.yml                      # DAB bundle config (targets + variables)
├── app.py                              # FastAPI application & API routes
├── requirements.txt                    # Python dependencies
├── server/
│   ├── config.py                       # Workspace client & configuration
│   ├── db.py                           # SQL operations (CRUD, audit)
│   ├── approval.py                     # Approval workflow & Gmail SMTP
│   ├── salesforce.py                   # SFDC accounts, spend, user identity
│   ├── models.py                       # Pydantic request models
│   └── tap_structure.py                # TAP Map section/subsection schema
├── scripts/
│   ├── deploy.sh                       # Deploy script (generates app.yaml per target)
│   ├── setup_environment.sh            # Full environment setup (scope, secrets, grants)
│   └── replicate_salesforce.py         # Salesforce data replication (logfood → workspace)
├── notebooks/
│   └── setup_secrets.py                # Databricks notebook to create secrets
└── frontend/
    ├── src/
    │   ├── App.tsx                      # Root component & routing
    │   ├── hooks/useApi.ts             # API client hooks
    │   ├── types.ts                    # TypeScript type definitions
    │   ├── tool-logos.ts               # Tool → logo mapping
    │   └── components/
    │       ├── AccountList.tsx          # Two-tab list view
    │       ├── TapMapEditor.tsx        # Edit mode + approval submission
    │       ├── TapMapViewer.tsx        # Read-only view + status banner
    │       ├── TapMapGrid.tsx          # Grid layout for sections
    │       ├── ReviewPage.tsx          # Manager review page
    │       ├── SubsectionCard.tsx      # Individual subsection card
    │       ├── ToolSelector.tsx        # Tool selection component
    │       ├── ToolPickerModal.tsx     # Tool search/pick modal
    │       ├── ToolChip.tsx            # Tool badge with logo
    │       └── ToolPalette.tsx         # Suggested tools palette
    ├── dist/                           # Built frontend (tracked in git)
    └── public/logos/                   # Vendor SVG logos
```

## Setup & Deployment

### Prerequisites

- Databricks workspace with **Unity Catalog** enabled
- **SQL Warehouse** (serverless recommended)
- **Python 3.11+**, **Node.js 18+**
- **Databricks CLI** authenticated (`databricks auth login`)
- **Gmail account** with [2-Step Verification](https://myaccount.google.com/security) and [App Password](https://myaccount.google.com/apppasswords)

### Step 1 — Configure your target in `databricks.yml`

Add a new target with your workspace parameters:

```yaml
targets:
  my-env:                                          # <- target name
    workspace:
      host: https://YOUR-WORKSPACE.cloud.databricks.com
      profile: YOUR_CLI_PROFILE                    # <- profile from ~/.databrickscfg
    variables:
      catalog: YOUR_CATALOG                        # <- Unity Catalog name
      schema: tap                                  # <- schema (default: tap)
      warehouse_id: "YOUR_WAREHOUSE_ID"            # <- SQL Warehouse ID
      secret_scope: YOUR_SECRET_SCOPE              # <- Databricks secret scope name
```

**Parameters to customize:**

| Parameter | Description | Example |
|-----------|-------------|---------|
| `host` | Databricks workspace URL | `https://my-workspace.cloud.databricks.com` |
| `profile` | CLI profile name from `~/.databrickscfg` | `my-profile` |
| `catalog` | Unity Catalog name for TAP Map tables | `my_catalog` |
| `schema` | Schema name (default: `tap`) | `tap` |
| `warehouse_id` | SQL Warehouse ID (found in SQL Warehouses page) | `abcdef1234567890` |
| `secret_scope` | Databricks secret scope for credentials | `my-secret-scope` |

### Step 2 — Create secrets

Run the notebook `notebooks/setup_secrets.py` in your workspace, or manually:

```bash
# Create scope
databricks secrets create-scope YOUR_SECRET_SCOPE -p YOUR_CLI_PROFILE

# Gmail credentials (for automated approval emails)
databricks secrets put-secret YOUR_SECRET_SCOPE tap-map-gmail-sender --string-value "your-app@gmail.com" -p YOUR_CLI_PROFILE
databricks secrets put-secret YOUR_SECRET_SCOPE tap-map-gmail-password --string-value "xxxx-xxxx-xxxx-xxxx" -p YOUR_CLI_PROFILE

# Logfood PAT (for Salesforce data replication)
# Generate at: https://adb-2548836972759138.18.azuredatabricks.net → Settings → Developer → Access Tokens
databricks secrets put-secret YOUR_SECRET_SCOPE logfood-pat --string-value "dapi..." -p YOUR_CLI_PROFILE
```

### Step 3 — Create the schema

```sql
CREATE SCHEMA IF NOT EXISTS YOUR_CATALOG.tap;
```

### Step 4 — Replicate Salesforce data

Run the replication script locally (requires profiles for both logfood and your workspace in `~/.databrickscfg`):

```bash
python scripts/replicate_salesforce.py
```

Edit the script to set your destination workspace parameters:
- `E2_HOST` → your workspace URL
- `E2_WAREHOUSE` → your warehouse ID
- `E2_PROFILE` → your CLI profile
- `TARGET_CATALOG` → your catalog name
- `TARGET_SCHEMA` → `tap`

This replicates 4 Salesforce tables from logfood:
- `core_accounts` — account list (name, AE, vertical, region)
- `account_team_member` — SA ↔ account mapping
- `core_opportunity` — contract/spend data
- `individual_hierarchy_workday` — manager hierarchy for approval workflow

### Step 5 — Deploy

```bash
./scripts/deploy.sh my-env
```

This script:
1. Reads variables from `databricks.yml` for the target
2. Generates `app.yaml` with the correct catalog, schema, warehouse, and secrets
3. Builds the frontend (`npm run build`)
4. Runs `databricks bundle deploy`

### Step 6 — Grant permissions to the App Service Principal

After the first deploy, the app creates a Service Principal. Grant it access:

```bash
# Find the SP application ID
databricks apps get YOUR_APP_NAME -p YOUR_CLI_PROFILE
# → note the service_principal_id, then:
databricks api get /api/2.0/preview/scim/v2/ServicePrincipals/SP_NUMERIC_ID -p YOUR_CLI_PROFILE
# → note the applicationId (UUID)
```

```sql
-- Unity Catalog grants
GRANT USE CATALOG ON CATALOG YOUR_CATALOG TO `SP_APPLICATION_ID`;
GRANT USE SCHEMA ON SCHEMA YOUR_CATALOG.tap TO `SP_APPLICATION_ID`;
GRANT CREATE TABLE ON SCHEMA YOUR_CATALOG.tap TO `SP_APPLICATION_ID`;
GRANT SELECT, MODIFY ON SCHEMA YOUR_CATALOG.tap TO `SP_APPLICATION_ID`;
```

```bash
# Secret scope access
databricks secrets put-acl YOUR_SECRET_SCOPE "SP_APPLICATION_ID" READ -p YOUR_CLI_PROFILE
```

### Step 7 — Force app restart

After granting permissions, redeploy the app to pick up the new config:

```bash
databricks apps deploy YOUR_APP_NAME \
  --source-code-path /Workspace/Users/YOUR_EMAIL/.bundle/tap-map-builder/my-env/files \
  -p YOUR_CLI_PROFILE
```

### Local development

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run dev &   # Vite dev server on :5173
uvicorn app:app --host 0.0.0.0 --port 8000   # FastAPI on :8000
```

## Environment Variables

Generated automatically in `app.yaml` by `scripts/deploy.sh`:

| Variable | Source | Description |
|----------|--------|-------------|
| `TAP_CATALOG` | `databricks.yml` variable | Unity Catalog name |
| `TAP_SCHEMA` | `databricks.yml` variable | Schema name |
| `DATABRICKS_WAREHOUSE_ID` | `databricks.yml` variable | SQL Warehouse ID for all queries |
| `DATABRICKS_APP_URL` | Auto-injected by Databricks Apps | Public URL (used in approval emails) |

Gmail credentials are read from Databricks Secrets at runtime via SDK (not env vars).

## Approval Workflow

```
SA fills TAP Map → Clicks "Submit for Approval"
    → Enters manager email (auto-populated from Workday hierarchy)
    → Backend creates approval record (status: pending, token: UUID)
    → Gmail SMTP sends HTML email to manager with review link

Manager clicks link in email
    → App verifies manager email matches X-Forwarded-Email header
    → Shows TAP Map in read-only view with Approve / Reject buttons
    → Decision triggers email back to SA with result

SA edits an approved TAP → Status resets to "draft" (re-submit required)
SA deletes a TAP → Approval records are also deleted
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | FastAPI, Pydantic, Databricks SDK |
| Database | Delta Lake (Unity Catalog) |
| Auth | Databricks App proxy headers (`X-Forwarded-Email`) |
| Email | Gmail SMTP (smtplib, App Password via Secrets) |
| Deployment | Databricks Asset Bundles (DAB) |

## License

Internal use — Databricks Field Engineering.
