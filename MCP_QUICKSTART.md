# Reversi MCP – Quick Start (Azure APIM Gateway)

## Architecture

```
Claude Desktop ──MCP──▶ Azure APIM (Developer tier) ──REST──▶ NestJS Backend (Container Apps)
VS Code Agent            (MCP Gateway, type=mcp)                     │
                                                                     ▼
                                                                WebSocket clients
                                                                 (browser players)
```

Azure API Management acts as the **MCP gateway**:

1. **MCP clients** (Claude Desktop, VS Code, MCP Inspector) connect to APIM's
   Streamable HTTP endpoint at `/reversi-game-api-mcp/mcp`.
2. **APIM** translates MCP `tools/call` → REST HTTP requests using the
   imported OpenAPI spec (each `operationId` → MCP tool name).
3. **NestJS backend** processes the REST call, updates shared game state,
   and emits events via the internal EventEmitter bridge.
4. **GameGateway** picks up events and broadcasts to browser WebSocket
   clients — so human players see moves made by AI in real-time.

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
- Provision the APIM instance (Developer tier — required for MCP)
- Import the OpenAPI spec (`reversi-api.openapi.yaml`)
- Create the MCP API (type=mcp) with tools mapped to REST operations
- Print the MCP endpoint URL

## 3. Configure your MCP client

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reversi-game": {
      "url": "https://apim-reversi-prod.azure-api.net/reversi-game-api-mcp/mcp"
    }
  }
}
```

### VS Code (GitHub Copilot Agent Mode)

Already configured in `.vscode/mcp.json`:

```json
{
  "servers": {
    "reversi-game": {
      "type": "http",
      "url": "https://apim-reversi-prod.azure-api.net/reversi-game-api-mcp/mcp"
    }
  }
}
```

Use the `MCP: Add Server` command palette or edit the file directly.

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

### REST API (through APIM)

```bash
APIM="https://apim-reversi-prod.azure-api.net/reversi"

curl $APIM/api/game/rooms
curl -X POST $APIM/api/game/rooms -H "Content-Type: application/json" -d '{"roomName": "Test"}'
```

### MCP Protocol (Streamable HTTP)

```bash
MCP="https://apim-reversi-prod.azure-api.net/reversi-game-api-mcp/mcp"

# Initialize
curl -s -m 10 $MCP -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":1,"params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# List tools
curl -s -m 10 $MCP -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":2}'

# Call a tool
curl -s -m 10 $MCP -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":3,"params":{"name":"listRooms","arguments":{}}}'
```

## Infrastructure

| Resource | Name | Notes |
|----------|------|-------|
| Resource Group | `rg-reversi-prod` | All resources |
| Container App (backend) | `ca-reversi-backend` | NestJS + Socket.io |
| Container App (frontend) | `ca-reversi` | Angular SPA + Nginx |
| APIM | `apim-reversi-prod` | Developer tier, MCP gateway |
| Key Vault | `kv-reversi-prod` | Secrets (Google OAuth, JWT) |
| Container Registry | `acrreversiprod` | Docker images |
