#!/usr/bin/env bash
#
# TAP Map Builder — Deploy script
#
# Usage:
#   ./scripts/deploy.sh dev     # deploy to e2-demo-field-eng
#   ./scripts/deploy.sh fevm    # deploy to FEVM
#
set -euo pipefail

TARGET="${1:-dev}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "▸ Deploying target: ${TARGET}"

# Extract variables from databricks.yml for the target
cd "${PROJECT_DIR}"
VARS=$(databricks bundle validate -t "${TARGET}" -o json 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)
vs = d.get('variables', {})
for k, v in vs.items():
    print(f\"{k}={v.get('value', v.get('default', ''))}\")
" 2>/dev/null || true)

# Parse variables
CATALOG=$(echo "$VARS" | grep "^catalog=" | cut -d= -f2)
SCHEMA=$(echo "$VARS" | grep "^schema=" | cut -d= -f2)
WAREHOUSE_ID=$(echo "$VARS" | grep "^warehouse_id=" | cut -d= -f2)
SECRET_SCOPE=$(echo "$VARS" | grep "^secret_scope=" | cut -d= -f2)
GMAIL_SENDER_KEY=$(echo "$VARS" | grep "^gmail_secret_sender=" | cut -d= -f2)
GMAIL_PASSWORD_KEY=$(echo "$VARS" | grep "^gmail_secret_password=" | cut -d= -f2)

echo "  Catalog:   ${CATALOG}.${SCHEMA}"
echo "  Warehouse: ${WAREHOUSE_ID}"
echo "  Scope:     ${SECRET_SCOPE}"

# Generate app.yaml
echo "▸ Generating app.yaml..."
cat > "${PROJECT_DIR}/app.yaml" <<YAML
command:
  - python
  - -m
  - uvicorn
  - app:app
  - --host
  - 0.0.0.0
  - --port
  - "8000"
env:
  - name: TAP_CATALOG
    value: "${CATALOG}"
  - name: TAP_SCHEMA
    value: "${SCHEMA}"
  - name: DATABRICKS_WAREHOUSE_ID
    value: "${WAREHOUSE_ID}"
resources:
  - name: sql-warehouse
    sql_warehouse:
      id: "${WAREHOUSE_ID}"
      permission: CAN_USE
  - name: gmail-sender
    secret:
      scope: "${SECRET_SCOPE}"
      key: "${GMAIL_SENDER_KEY}"
      permission: READ
  - name: gmail-password
    secret:
      scope: "${SECRET_SCOPE}"
      key: "${GMAIL_PASSWORD_KEY}"
      permission: READ
YAML
echo "  ✓ app.yaml generated"

# Build frontend
echo "▸ Building frontend..."
cd "${PROJECT_DIR}/frontend" && npm run build 2>&1 | tail -3
cd "${PROJECT_DIR}"

# Bundle deploy
echo "▸ Running bundle deploy..."
databricks bundle deploy -t "${TARGET}"

echo ""
echo "✅ Deploy complete for target: ${TARGET}"
