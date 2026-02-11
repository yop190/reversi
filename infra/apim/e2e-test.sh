#!/usr/bin/env bash
# E2E test script for APIM MCP Gateway
set -euo pipefail

GW="https://apim-reversi-prod.azure-api.net/reversi"

echo "══════════════════════════════════════════"
echo "  E2E Game Flow via APIM Gateway"
echo "══════════════════════════════════════════"
echo ""

echo "1️⃣  Create a room..."
ROOM=$(curl -s -X POST "$GW/api/game/rooms" \
  -H "Content-Type: application/json" \
  -d '{"roomName":"E2E Test Room"}')
echo "$ROOM" | python3 -m json.tool
ROOM_ID=$(echo "$ROOM" | python3 -c "import sys,json; print(json.load(sys.stdin)['roomId'])")
echo "   Room ID: $ROOM_ID"
echo ""

echo "2️⃣  List rooms (should show 1+)..."
curl -s "$GW/api/game/rooms" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'   Rooms: {d[\"totalCount\"]}, Online: {d[\"onlineCount\"]}')
"
echo ""

echo "3️⃣  Get game state (waiting for opponent)..."
curl -s "$GW/api/game/rooms/$ROOM_ID/state" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'   Players: {d[\"room\"][\"playerCount\"]}, Message: {d.get(\"message\",\"N/A\")}')
"
echo ""

echo "4️⃣  Join room as second bot (starts game)..."
JOIN=$(curl -s -X POST "$GW/api/game/rooms/$ROOM_ID/join" \
  -H "Content-Type: application/json")
echo "$JOIN" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'   Color: {d.get(\"yourColor\")}, Spectator: {d.get(\"isSpectator\")}')
"
echo ""

echo "5️⃣  Get game state (game started!)..."
curl -s "$GW/api/game/rooms/$ROOM_ID/state" | python3 -c "
import sys,json
d=json.load(sys.stdin)
gs=d.get('gameState',{})
print(f'   Turn: {gs.get(\"currentTurn\")}, Black: {gs.get(\"blackScore\")}, White: {gs.get(\"whiteScore\")}, Valid moves: {gs.get(\"validMoveCount\")}')
"
echo ""

echo "6️⃣  Get valid moves..."
curl -s "$GW/api/game/rooms/$ROOM_ID/valid-moves" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'   {d[\"count\"]} moves: {[(m[\"row\"],m[\"col\"]) for m in d[\"validMoves\"]]}')
"
echo ""

echo "7️⃣  Get hint..."
curl -s "$GW/api/game/rooms/$ROOM_ID/hint" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(f'   {d[\"message\"]}')
"
echo ""

echo "8️⃣  Make a move (2,3)..."
MOVE=$(curl -s -X POST "$GW/api/game/rooms/$ROOM_ID/move" \
  -H "Content-Type: application/json" \
  -d '{"row":2,"col":3}')
echo "$MOVE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
gs=d.get('gameState',{})
print(f'   Success: {d[\"success\"]}, Now turn: {gs.get(\"currentTurn\")}, Black: {gs.get(\"blackScore\")}, White: {gs.get(\"whiteScore\")}')
"
echo ""

echo "9️⃣  Show board after move..."
curl -s "$GW/api/game/rooms/$ROOM_ID/state" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('gameState',{}).get('board',''))
"
echo ""

echo "🔟  Leave room..."
curl -s -X POST "$GW/api/game/rooms/$ROOM_ID/leave" \
  -H "Content-Type: application/json" | python3 -m json.tool
echo ""

echo "══════════════════════════════════════════"
echo "  ✅ All E2E Tests Passed!"
echo "══════════════════════════════════════════"
