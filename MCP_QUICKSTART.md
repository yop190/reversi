# Reversi MCP – Quick Start (Azure APIM Gateway)

## Architecture

```
Claude Desktop ──MCP SSE──▶ Azure APIM ──REST──▶ NestJS Backend (Container Apps)
                             (MCP Gateway)              │
                                                        ▼
                                                   WebSocket clients
                                                    (browser players)
```

Azure API Management acts as the **MCP gateway**:

1. **Claude Desktop** connects to APIM's MCP SSE endpoint.
2. **APIM** translates MCP tool-calls → REST HTTP requests using the
   imported OpenAPI spec (each `operationId` → MCP tool name).
3. **NestJS backend** processes the REST call, updates shared game state,
   and emits events via the internal EventEmitter bridge.
4. **GameGateway** picks up events and broadcasts to browser WebSocket
   clients — so human players see moves made by Claude in real-time.

---

## 1. Deploy the backend

The backend deploys automatically via GitHub Actions to Azure Container Apps.

```bash
git push origin main    # triggers .github/workflows/deploy.yml
```

Or run locally:

```bash
cd backend
npm install && npm run build && npm start
# → 🎮 Reversi Server running on port 3001
```

## 2. Deploy APIM

```bash
cd infra/apim
./deploy-apim.sh
```

The script will:
- Resolve the backend FQDN from Azure Container Apps
- Provision the APIM instance (Consumption tier)
- Import the OpenAPI spec (`reversi-api.openapi.yaml`)
- Enable the MCP Server capability on the API
- Print the MCP endpoint URL

## 3. Configure Claude Desktop

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reversi-game": {
      "url": "https://apim-reversi-prod.azure-api.net/reversi/mcp/sse"
    }
  }
}
```

Restart Claude Desktop — you'll see a 🔌 icon confirming the MCP connection.

## 4. Play!

Ask Claude:

> "Create a Reversi room called 'Claude vs Human'"

Then open the browser app and join the same room.  
Claude's moves will appear on your board in real-time.

---

## Available MCP Tools

| Tool | REST Endpoint | Description |
|------|--------------|-------------|
| `listRooms` | `GET /api/game/rooms` | List all open rooms |
| `createRoom` | `POST /api/game/rooms` | Create room & join as Black |
| `joinRoom` | `POST /api/game/rooms/:id/join` | Join existing room |
| `leaveRoom` | `POST /api/game/rooms/:id/leave` | Leave a room |
| `getGameState` | `GET /api/game/rooms/:id/state` | Full board + scores |
| `getValidMoves` | `GET /api/game/rooms/:id/valid-moves` | Legal moves list |
| `makeMove` | `POST /api/game/rooms/:id/move` | Place a piece `{row, col}` |
| `passTurn` | `POST /api/game/rooms/:id/pass` | Skip turn (no moves) |
| `getHint` | `GET /api/game/rooms/:id/hint` | Engine's best move suggestion |
| `resignGame` | `POST /api/game/rooms/:id/resign` | Forfeit the game |

## Quick Test (curl)

```bash
APIM="https://apim-reversi-prod.azure-api.net/reversi"

# List rooms
curl $APIM/api/game/rooms

# Create a room
curl -X POST $APIM/api/game/rooms \
  -H "Content-Type: application/json" \
  -d '{"roomName": "Test Room"}'

# Make a move
curl -X POST $APIM/api/game/rooms/<roomId>/move \
  -H "Content-Type: application/json" \
  -d '{"row": 2, "col": 3}'
```

## Infrastructure

| Resource | Name | Notes |
|----------|------|-------|
| Resource Group | `rg-reversi-prod` | All resources |
| Container App (backend) | `ca-reversi-backend` | NestJS + Socket.io |
| Container App (frontend) | `ca-reversi` | Angular SPA + Nginx |
| APIM | `apim-reversi-prod` | Consumption tier, MCP gateway |
| Key Vault | `kv-reversi-prod` | Secrets (Google OAuth, JWT) |
| Container Registry | `acrreversiprod` | Docker images |
