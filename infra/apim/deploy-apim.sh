#!/usr/bin/env bash
# ─── Deploy APIM + Import API + Enable MCP ──────────────────────────────────
#
# Usage:
#   ./deploy-apim.sh [--backend-url <URL>]
#
# Prerequisites:
#   - az CLI logged in with Contributor on rg-reversi-prod
#   - Backend Container App already deployed
#
# What it does:
#   1. Resolves backend FQDN from Container App (or uses --backend-url)
#   2. Deploys the Bicep template (APIM instance + backend + policy)
#   3. Imports the OpenAPI spec into the API
#   4. Enables the MCP Server feature on the API
#   5. Prints the MCP endpoint URL for Claude Desktop
# ────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

RESOURCE_GROUP="rg-reversi-prod"
LOCATION="westeurope"
APIM_NAME="apim-reversi-prod"
CONTAINER_APP_BACKEND="ca-reversi-backend"
API_ID="reversi-game-api"
OPENAPI_SPEC="$(dirname "$0")/reversi-api.openapi.yaml"

# ─── Parse args ──────────────────────────────────────────────────────────────

BACKEND_URL=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --backend-url) BACKEND_URL="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ─── Resolve backend URL ────────────────────────────────────────────────────

if [[ -z "$BACKEND_URL" ]]; then
  echo "🔍 Resolving backend FQDN from Container App '$CONTAINER_APP_BACKEND'…"
  BACKEND_FQDN=$(az containerapp show \
    --name "$CONTAINER_APP_BACKEND" \
    --resource-group "$RESOURCE_GROUP" \
    --query "properties.configuration.ingress.fqdn" -o tsv 2>/dev/null || true)

  if [[ -z "$BACKEND_FQDN" ]]; then
    echo "❌ Could not resolve backend FQDN. Pass --backend-url explicitly."
    exit 1
  fi
  BACKEND_URL="https://${BACKEND_FQDN}"
fi

echo "✅ Backend URL: $BACKEND_URL"

# ─── Step 1: Deploy Bicep ───────────────────────────────────────────────────

echo ""
echo "📦 Deploying APIM infrastructure (Bicep)…"
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file "$(dirname "$0")/main.bicep" \
  --parameters backendUrl="$BACKEND_URL" \
  --name "apim-reversi-$(date +%Y%m%d%H%M%S)" \
  --output none

echo "✅ APIM instance provisioned: $APIM_NAME"

# ─── Step 2: Import OpenAPI spec ────────────────────────────────────────────

echo ""
echo "📄 Importing OpenAPI specification into APIM…"
az apim api import \
  --resource-group "$RESOURCE_GROUP" \
  --service-name "$APIM_NAME" \
  --api-id "$API_ID" \
  --path "reversi" \
  --specification-format OpenApiJson \
  --specification-path "$OPENAPI_SPEC" \
  --service-url "$BACKEND_URL" \
  --output none 2>/dev/null || \
az apim api import \
  --resource-group "$RESOURCE_GROUP" \
  --service-name "$APIM_NAME" \
  --api-id "$API_ID" \
  --path "reversi" \
  --specification-format OpenApi \
  --specification-path "$OPENAPI_SPEC" \
  --service-url "$BACKEND_URL" \
  --output none

echo "✅ API imported from OpenAPI spec"

# ─── Step 3: Enable MCP Server on the API ───────────────────────────────────

echo ""
echo "🔌 Enabling MCP Server capability on the API…"

# APIM MCP gateway is enabled via the API properties.
# As of 2025 this uses the REST API directly to set the
# 'isMcpServer' flag on the API entity.
APIM_API_VERSION="2024-06-01-preview"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az rest --method PATCH \
  --url "https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ApiManagement/service/${APIM_NAME}/apis/${API_ID}?api-version=${APIM_API_VERSION}" \
  --body '{
    "properties": {
      "type": "mcp"
    }
  }' \
  --output none 2>/dev/null && echo "✅ MCP Server feature enabled" || {
    echo "⚠️  MCP flag could not be set via REST API."
    echo "   You can enable it manually in the Azure Portal:"
    echo "   APIM → APIs → Reversi Game API → Settings → Enable as MCP Server"
  }

# ─── Step 4: Print results ──────────────────────────────────────────────────

GATEWAY_URL=$(az apim show \
  --name "$APIM_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --query "gatewayUrl" -o tsv)

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  🎮 Reversi MCP Gateway Deployed!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  APIM Gateway :  $GATEWAY_URL"
echo "  REST Base URL :  $GATEWAY_URL/reversi/api/game"
echo "  MCP Endpoint  :  $GATEWAY_URL/reversi/mcp"
echo ""
echo "  Claude Desktop config (claude_desktop_config.json):"
echo ""
echo "  {"
echo "    \"mcpServers\": {"
echo "      \"reversi\": {"
echo "        \"url\": \"$GATEWAY_URL/reversi/mcp/sse\""
echo "      }"
echo "    }"
echo "  }"
echo ""
echo "  Quick test:"
echo "    curl $GATEWAY_URL/reversi/api/game/rooms"
echo ""
echo "═══════════════════════════════════════════════════════════════"
