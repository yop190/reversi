#!/bin/bash
set -euo pipefail

BASE="https://management.azure.com/subscriptions/86fd9512-4fa8-4562-b05d-b2636c882143/resourceGroups/rg-reversi-prod/providers/Microsoft.ApiManagement/service/apim-reversi-prod"
AV="api-version=2025-03-01-preview"
MCP="reversi-game-api-mcp"
OP="/subscriptions/86fd9512-4fa8-4562-b05d-b2636c882143/resourceGroups/rg-reversi-prod/providers/Microsoft.ApiManagement/service/apim-reversi-prod/apis/reversi-game-api/operations"

create_tool() {
  local id=$1
  local desc=$2
  echo -n "  ${id}... "
  az rest --method PUT \
    --url "${BASE}/apis/${MCP}/tools/${id}?${AV}" \
    --body "{\"properties\":{\"displayName\":\"${id}\",\"description\":\"${desc}\",\"operationId\":\"${OP}/${id}\"}}" \
    -o none 2>&1 && echo "OK" || echo "FAILED"
}

echo "Creating 10 MCP tools..."
create_tool "listRooms" "List all available game rooms with player counts and status"
create_tool "createRoom" "Create a new game room with optional custom settings"
create_tool "joinRoom" "Join an existing game room as a player"
create_tool "leaveRoom" "Leave a game room"
create_tool "getGameState" "Get the current game state including board scores and turn info"
create_tool "getValidMoves" "Get all valid moves for the current player"
create_tool "makeMove" "Place a piece on the board at the specified position"
create_tool "passTurn" "Pass the current turn when no valid moves are available"
create_tool "getHint" "Get an AI-suggested best move for the current position"
create_tool "resignGame" "Resign from the current game"

echo ""
echo "Listing tools..."
az rest --method GET \
  --url "${BASE}/apis/${MCP}/tools?${AV}" \
  --query "value[].{name:name,display:properties.displayName}" -o table
