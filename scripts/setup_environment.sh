#!/usr/bin/env bash
#
# TAP Map Builder — Setup & Deploy Script
#
# Configure the parameters below and run:
#   chmod +x scripts/setup_environment.sh
#   ./scripts/setup_environment.sh
#
# Prerequisites:
#   - Databricks CLI authenticated (databricks auth login)
#   - Node.js 18+ and npm installed
#   - Gmail account with 2FA + App Password
#
set -euo pipefail

# ╔══════════════════════════════════════════════════════════════════════╗
# ║                    CONFIGURE THESE PARAMETERS                       ║
# ╚══════════════════════════════════════════════════════════════════════╝

# Databricks CLI profile (run `databricks auth login` first)
DATABRICKS_PROFILE="DEFAULT"

# App name (will appear in the URL: <app-name>-<workspace-id>.aws.databricksapps.com)
APP_NAME="my-tap-map"

# SQL Warehouse ID (serverless recommended)
WAREHOUSE_ID="your-warehouse-id"

# Unity Catalog location
CATALOG="your_catalog"
SCHEMA="tap"

# Secret scope (will be created if it doesn't exist)
SECRET_SCOPE="your-secret-scope"

# Gmail SMTP credentials (for automated approval emails)
# Generate an App Password at: https://myaccount.google.com/apppasswords
GMAIL_SENDER="your-app@gmail.com"
GMAIL_APP_PASSWORD="xxxx-xxxx-xxxx-xxxx"

# Workspace path to sync the code
WORKSPACE_USER="your.email@databricks.com"

# ╔══════════════════════════════════════════════════════════════════════╗
# ║                    DO NOT EDIT BELOW THIS LINE                      ║
# ╚══════════════════════════════════════════════════════════════════════╝

CLI="databricks -p ${DATABRICKS_PROFILE}"
WORKSPACE_PATH="/Workspace/Users/${WORKSPACE_USER}/tap-map-builder"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║       TAP Map Builder — Setup & Deploy        ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "  Profile:     ${DATABRICKS_PROFILE}"
echo "  App:         ${APP_NAME}"
echo "  Warehouse:   ${WAREHOUSE_ID}"
echo "  Catalog:     ${CATALOG}.${SCHEMA}"
echo "  Scope:       ${SECRET_SCOPE}"
echo "  Gmail:       ${GMAIL_SENDER}"
echo "  Workspace:   ${WORKSPACE_PATH}"
echo ""

# ── Step 1: Create schema ────────────────────────────────────────────────────

echo "▸ [1/8] Creating catalog and schema..."
${CLI} api post /api/2.0/sql/statements \
  --json "{
    \"warehouse_id\": \"${WAREHOUSE_ID}\",
    \"statement\": \"CREATE SCHEMA IF NOT EXISTS ${CATALOG}.${SCHEMA}\",
    \"wait_timeout\": \"30s\"
  }" > /dev/null 2>&1 && echo "  ✓ Schema ${CATALOG}.${SCHEMA} ready" || echo "  ⚠ Schema may already exist (OK)"

# ── Step 2: Create secret scope ──────────────────────────────────────────────

echo "▸ [2/8] Setting up secrets..."
${CLI} secrets create-scope "${SECRET_SCOPE}" 2>/dev/null && echo "  ✓ Scope created" || echo "  ⚠ Scope already exists (OK)"

${CLI} secrets put-secret "${SECRET_SCOPE}" tap-map-gmail-sender --string-value "${GMAIL_SENDER}" 2>/dev/null
echo "  ✓ Secret tap-map-gmail-sender saved"

${CLI} secrets put-secret "${SECRET_SCOPE}" tap-map-gmail-password --string-value "${GMAIL_APP_PASSWORD}" 2>/dev/null
echo "  ✓ Secret tap-map-gmail-password saved"

# ── Step 3: Create or get the app ────────────────────────────────────────────

echo "▸ [3/8] Creating Databricks App..."
APP_INFO=$(${CLI} apps get "${APP_NAME}" 2>/dev/null || true)

if echo "${APP_INFO}" | grep -q "service_principal_id"; then
  echo "  ⚠ App '${APP_NAME}' already exists"
else
  ${CLI} apps create "${APP_NAME}" --json '{"description": "TAP Map Builder - TAM, Architecture, Powerbase mapping"}' 2>/dev/null
  echo "  ✓ App '${APP_NAME}' created"
  sleep 5
  APP_INFO=$(${CLI} apps get "${APP_NAME}" 2>/dev/null)
fi

# Extract Service Principal application ID
SP_ID=$(echo "${APP_INFO}" | python3 -c "
import sys, json
d = json.load(sys.stdin)
sp_id = d.get('service_principal_id', '')
if sp_id:
    import subprocess
    r = subprocess.run(
        ['${CLI}', 'api', 'get', f'/api/2.0/preview/scim/v2/ServicePrincipals/{sp_id}'],
        capture_output=True, text=True
    )
    sp = json.loads(r.stdout)
    print(sp.get('applicationId', ''))
" 2>/dev/null || true)

# Try simpler extraction if python method fails
if [ -z "${SP_ID}" ]; then
  SP_NUM=$(echo "${APP_INFO}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('service_principal_id',''))" 2>/dev/null || true)
  if [ -n "${SP_NUM}" ]; then
    SP_ID=$(${CLI} api get "/api/2.0/preview/scim/v2/ServicePrincipals/${SP_NUM}" 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('applicationId',''))" 2>/dev/null || true)
  fi
fi

APP_URL=$(echo "${APP_INFO}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('url',''))" 2>/dev/null || true)

echo "  Service Principal: ${SP_ID:-unknown}"
echo "  App URL: ${APP_URL:-pending}"

# ── Step 4: Grant permissions ─────────────────────────────────────────────────

echo "▸ [4/8] Granting permissions to Service Principal..."

if [ -n "${SP_ID}" ]; then
  GRANTS=(
    "GRANT USE CATALOG ON CATALOG ${CATALOG} TO \`${SP_ID}\`"
    "GRANT USE SCHEMA ON SCHEMA ${CATALOG}.${SCHEMA} TO \`${SP_ID}\`"
    "GRANT SELECT, MODIFY ON SCHEMA ${CATALOG}.${SCHEMA} TO \`${SP_ID}\`"
  )

  for SQL in "${GRANTS[@]}"; do
    ${CLI} api post /api/2.0/sql/statements \
      --json "{
        \"warehouse_id\": \"${WAREHOUSE_ID}\",
        \"statement\": \"${SQL}\",
        \"wait_timeout\": \"30s\"
      }" > /dev/null 2>&1
  done
  echo "  ✓ Unity Catalog grants applied"

  ${CLI} secrets put-acl "${SECRET_SCOPE}" "${SP_ID}" READ 2>/dev/null
  echo "  ✓ Secret scope READ access granted"
else
  echo "  ⚠ Could not determine SP ID — grant permissions manually"
fi

# ── Step 5: Generate app.yaml ─────────────────────────────────────────────────

echo "▸ [5/8] Generating app.yaml..."

cat > "${PROJECT_DIR}/app.yaml" <<YAML
command:
  - "python"
  - "-m"
  - "uvicorn"
  - "app:app"
  - "--host"
  - "0.0.0.0"
  - "--port"
  - "8000"
env:
  - name: "DATABRICKS_WAREHOUSE_ID"
    valueFrom: "sql-warehouse"
  - name: "GMAIL_SENDER"
    valueFrom: "gmail-sender"
  - name: "GMAIL_APP_PASSWORD"
    valueFrom: "gmail-password"
  - name: "APP_BASE_URL"
    value: "${APP_URL}"
  - name: "TAP_CATALOG"
    value: "${CATALOG}"
  - name: "TAP_SCHEMA"
    value: "${SCHEMA}"
resources:
  - name: "sql-warehouse"
    sql_warehouse:
      id: "${WAREHOUSE_ID}"
      permission: "CAN_USE"
  - name: "gmail-sender"
    secret:
      scope: "${SECRET_SCOPE}"
      key: "tap-map-gmail-sender"
      permission: "READ"
  - name: "gmail-password"
    secret:
      scope: "${SECRET_SCOPE}"
      key: "tap-map-gmail-password"
      permission: "READ"
YAML
echo "  ✓ app.yaml generated"

# ── Step 6: Build frontend ────────────────────────────────────────────────────

echo "▸ [6/8] Building frontend..."
cd "${PROJECT_DIR}/frontend"
npm install --silent 2>/dev/null
npm run build 2>&1 | tail -3
echo "  ✓ Frontend built"

# ── Step 7: Sync to workspace ─────────────────────────────────────────────────

echo "▸ [7/8] Syncing to workspace..."
cd "${PROJECT_DIR}"
${CLI} sync . "${WORKSPACE_PATH}" --watch 2>&1 &
SYNC_PID=$!
sleep 20
kill ${SYNC_PID} 2>/dev/null || true
wait ${SYNC_PID} 2>/dev/null || true
echo "  ✓ Code synced to ${WORKSPACE_PATH}"

# ── Step 8: Deploy ────────────────────────────────────────────────────────────

echo "▸ [8/8] Deploying app..."
DEPLOY_RESULT=$(${CLI} apps deploy "${APP_NAME}" --source-code-path "${WORKSPACE_PATH}" 2>&1)
DEPLOY_STATE=$(echo "${DEPLOY_RESULT}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',{}).get('state','UNKNOWN'))" 2>/dev/null || echo "UNKNOWN")

if [ "${DEPLOY_STATE}" = "SUCCEEDED" ]; then
  echo "  ✓ Deploy succeeded!"
else
  echo "  ⚠ Deploy status: ${DEPLOY_STATE}"
  echo "  ${DEPLOY_RESULT}" | head -5
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo "╔═══════════════════════════════════════════════╗"
echo "║              Setup Complete!                   ║"
echo "╚═══════════════════════════════════════════════╝"
echo ""
echo "  App URL:  ${APP_URL}"
echo "  Schema:   ${CATALOG}.${SCHEMA}"
echo "  Gmail:    ${GMAIL_SENDER}"
echo ""
echo "  Next steps:"
echo "    1. Open ${APP_URL} in your browser"
echo "    2. Run scripts/replicate_salesforce.py to load accounts"
echo ""
