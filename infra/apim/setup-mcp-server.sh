#!/bin/bash
set -euo pipefail

# ============================================================
# Setup MCP Server on Azure APIM (Developer tier)
# Creates MCP API + maps 10 tools to REST API operations
# ============================================================

SUBSCRIPTION_ID="86fd9512-4fa8-4562-b05d-b2636c882143"
RESOURCE_GROUP="rg-reversi-prod"
SERVICE_NAME="apim-reversi-prod"
SOURCE_API_ID="reversi-game-api"
MCP_API_ID="reversi-game-api-mcp"
API_VERSION="2025-03-01-preview"
BACKEND_URL="https://ca-reversi-backend.graystone-893f55ee.westeurope.azurecontainerapps.io"

BASE_URL="https://management.azure.com/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ApiManagement/service/${SERVICE_NAME}"

echo "=== Step 1: Create MCP API (${MCP_API_ID}) ==="
az rest --method PUT \
  --url "${BASE_URL}/apis/${MCP_API_ID}?api-version=${API_VERSION}" \
  --body "{
    \"properties\": {
      \"displayName\": \"Reversi Game MCP Server\",
      \"description\": \"MCP Server exposing Reversi game operations as tools for AI agents\",
      \"path\": \"${MCP_API_ID}\",
      \"protocols\": [\"https\"],
      \"serviceUrl\": \"${BACKEND_URL}\",
      \"subscriptionRequired\": false
    }
  }" --query "{name:name, path:properties.path, state:properties.provisioningState}" -o json

echo ""
echo "Setting API type to MCP..."
az rest --method PATCH \
  --url "${BASE_URL}/apis/${MCP_API_ID}?api-version=${API_VERSION}" \
  --body '{"properties":{"type":"mcp"}}' \
  --query "{name:name, type:properties.type}" -o json

echo ""
echo "Waiting 10s for API provisioning..."
sleep 10

echo ""
echo "=== Step 2: Create MCP Tools (mapping to REST API operations) ==="

# Full ARM resource ID prefix for source API operations
OP_PREFIX="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.ApiManagement/service/${SERVICE_NAME}/apis/${SOURCE_API_ID}/operations"

# Tool definitions: toolId | displayName | description | operationId
TOOLS=(
  "listRooms|listRooms|List all available game rooms with player counts and status|listRooms"
  "createRoom|createRoom|Create a new game room with optional custom settings|createRoom"
  "joinRoom|joinRoom|Join an existing game room as a player|joinRoom"
  "leaveRoom|leaveRoom|Leave a game room|leaveRoom"
  "getGameState|getGameState|Get the current game state including board, scores, and turn info|getGameState"
  "getValidMoves|getValidMoves|Get all valid moves for the current player|getValidMoves"
  "makeMove|makeMove|Place a piece on the board at the specified position|makeMove"
  "passTurn|passTurn|Pass the current turn when no valid moves are available|passTurn"
  "getHint|getHint|Get an AI-suggested best move for the current position|getHint"
  "resignGame|resignGame|Resign from the current game|resignGame"
)

SUCCESS=0
FAIL=0

for TOOL_DEF in "${TOOLS[@]}"; do
  IFS='|' read -r TOOL_ID DISPLAY_NAME DESCRIPTION OPERATION_ID <<< "$TOOL_DEF"
  
  echo "  Creating tool: ${TOOL_ID}..."
  
  RESULT=$(az rest --method PUT \
    --url "${BASE_URL}/apis/${MCP_API_ID}/tools/${TOOL_ID}?api-version=${API_VERSION}" \
    --body "{
      \"properties\": {
        \"displayName\": \"${DISPLAY_NAME}\",
        \"description\": \"${DESCRIPTION}\",
        \"operationId\": \"${OP_PREFIX}/${OPERATION_ID}\"
      }
    }" -o json 2>&1) && {
      echo "    ✅ ${TOOL_ID} created"
      SUCCESS=$((SUCCESS + 1))
    } || {
      echo "    ❌ ${TOOL_ID} FAILED: ${RESULT}"
      FAIL=$((FAIL + 1))
    }
done

echo ""
echo "=== Results ==="
echo "  Tools created: ${SUCCESS}/10"
echo "  Tools failed:  ${FAIL}/10"

echo ""
echo "=== Step 3: Verify MCP Tools ==="
az rest --method GET \
  --url "${BASE_URL}/apis/${MCP_API_ID}/tools?api-version=${API_VERSION}" \
  --query "value[].{name:name, displayName:properties.displayName}" -o table

echo ""
echo "=== MCP Server Setup Complete ==="
echo ""
echo "MCP Endpoint (Streamable HTTP):"
echo "  https://${SERVICE_NAME}.azure-api.net/${MCP_API_ID}/mcp"
echo ""
echo "MCP Endpoint (SSE - deprecated):"  
echo "  https://${SERVICE_NAME}.azure-api.net/${MCP_API_ID}/sse"
echo ""
echo "Claude Desktop config (add to ~/.config/claude/claude_desktop_config.json):"
echo '  {
    "mcpServers": {
      "reversi": {
        "url": "https://'"${SERVICE_NAME}"'.azure-api.net/'"${MCP_API_ID}"'/mcp"
      }
    }
  }'
echo ""
echo "VS Code MCP config (.vscode/mcp.json):"
echo '  {
    "servers": {
      "reversi": {
        "type": "http",
        "url": "https://'"${SERVICE_NAME}"'.azure-api.net/'"${MCP_API_ID}"'/mcp"
      }
    }
  }'
