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
                    │   pedro_zanela.tap                    │
                    │   ├─ tap_maps                         │
                    │   ├─ tap_account_metadata             │
                    │   ├─ tap_maps_audit                   │
                    │   ├─ tap_map_approvals                │
                    │   ├─ salesforce_accounts (replicated) │
                    │   └─ individual_hierarchy_workday     │
                    │                                       │
                    │        Secrets                         │
                    │   pedro-zanela-scope                   │
                    │   ├─ tap-map-gmail-sender              │
                    │   └─ tap-map-gmail-password            │
                    │                                       │
                    │        SQL Warehouse (Serverless)      │
                    └───────────────────────────────────────┘
```

## Project Structure

```
tap-map-builder/
├── app.py                          # FastAPI application & API routes
├── app.yaml                        # Databricks App configuration
├── requirements.txt                # Python dependencies
├── server/
│   ├── config.py                   # Workspace client & configuration
│   ├── db.py                       # SQL operations (CRUD, audit)
│   ├── approval.py                 # Approval workflow & Gmail SMTP
│   ├── salesforce.py               # SFDC accounts, spend, user identity
│   ├── models.py                   # Pydantic request models
│   └── tap_structure.py            # TAP Map section/subsection schema
├── scripts/
│   └── replicate_salesforce.py     # D-1 Salesforce data replication
└── frontend/
    ├── src/
    │   ├── App.tsx                  # Root component & routing
    │   ├── hooks/useApi.ts          # API client hooks
    │   ├── types.ts                 # TypeScript type definitions
    │   ├── tool-logos.ts            # Tool → logo mapping
    │   └── components/
    │       ├── AccountList.tsx      # Two-tab list view
    │       ├── TapMapEditor.tsx     # Edit mode + approval submission
    │       ├── TapMapViewer.tsx     # Read-only view + status banner
    │       ├── TapMapGrid.tsx       # Grid layout for sections
    │       ├── ReviewPage.tsx       # Manager review page
    │       ├── SubsectionCard.tsx   # Individual subsection card
    │       ├── ToolSelector.tsx     # Tool selection component
    │       ├── ToolPickerModal.tsx  # Tool search/pick modal
    │       ├── ToolChip.tsx         # Tool badge with logo
    │       └── ToolPalette.tsx      # Suggested tools palette
    └── public/logos/                # Vendor SVG logos
```

## Setup & Deployment

### Prerequisites

- Databricks workspace with Unity Catalog enabled
- Serverless SQL Warehouse
- Python 3.11+, Node.js 18+

### 1. Configure secrets

```bash
# Gmail account for automated email notifications
databricks secrets put-secret <scope> tap-map-gmail-sender --string-value "your-app@gmail.com"
databricks secrets put-secret <scope> tap-map-gmail-password --string-value "your-app-password"
```

> The Gmail account needs [2-Step Verification](https://myaccount.google.com/security) enabled and an [App Password](https://myaccount.google.com/apppasswords) generated.

### 2. Grant permissions to the App Service Principal

```sql
GRANT USE CATALOG ON CATALOG <catalog> TO `<service-principal-app-id>`;
GRANT USE SCHEMA ON SCHEMA <catalog>.<schema> TO `<service-principal-app-id>`;
GRANT SELECT, MODIFY ON SCHEMA <catalog>.<schema> TO `<service-principal-app-id>`;
```

```bash
databricks secrets put-acl <scope> "<service-principal-app-id>" READ
```

### 3. Build frontend

```bash
cd frontend
npm install
npm run build
```

### 4. Deploy

```bash
# Sync to workspace
databricks sync . /Workspace/Users/<user>/tap-map-builder

# Deploy the app
databricks apps deploy <app-name> --source-code-path /Workspace/Users/<user>/tap-map-builder
```

### Local development

```bash
pip install -r requirements.txt
cd frontend && npm install && npm run dev &   # Vite dev server on :5173
uvicorn app:app --host 0.0.0.0 --port 8000   # FastAPI on :8000
```

## Configuration

All configuration is in `app.yaml`:

| Environment Variable | Source | Description |
|---------------------|--------|-------------|
| `DATABRICKS_WAREHOUSE_ID` | SQL Warehouse resource | Serverless warehouse for all queries |
| `GMAIL_SENDER` | Secret | Gmail address for sending notifications |
| `GMAIL_APP_PASSWORD` | Secret | Gmail App Password |
| `APP_BASE_URL` | Static value | Public URL of the deployed app |

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
| Email | Gmail SMTP (smtplib, App Password) |
| Deployment | Databricks Apps |

## License

Internal use — Databricks Field Engineering.
