# Reversi MCP – Quick Start

## Architecture

```
Claude Desktop ──stdio──▶ mcp-stdio.js ──HTTP──▶ NestJS backend (:3001)
                                                    ├─ /mcp/tools        (GET  – list tools)
                                                    ├─ /mcp/jsonrpc      (POST – JSON-RPC 2.0)
                                                    └─ /mcp/tools/call   (POST – simplified REST)
```

The backend already runs the MCP controller (`McpModule`) alongside the
existing WebSocket game gateway. No separate server process is needed.

The **stdio bridge** (`mcp-stdio.ts`) is a thin Node.js script that
Claude Desktop spawns; it reads JSON-RPC from stdin, forwards it to the
backend over HTTP, and writes responses to stdout.

---

## 1. Build the backend

```bash
cd backend
npm install          # first time only
npm run build        # compiles TypeScript → dist/
```

## 2. Start the backend

```bash
npm start
# → 🎮 Reversi Server running on port 3001
# → MCP controller initialised – tools available:
#     • listRooms
#     • createRoom
#     • makeMove
#     ...
```

## 3. Verify MCP endpoints

```bash
# List tools
curl http://localhost:3001/mcp/tools | jq

# Create a room (simplified REST)
curl -s -X POST http://localhost:3001/mcp/tools/call \
  -H 'Content-Type: application/json' \
  -d '{"name":"createRoom","arguments":{"roomName":"Test Game"}}' | jq

# JSON-RPC handshake
curl -s -X POST http://localhost:3001/mcp/jsonrpc \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}' | jq
```

## 4. Configure Claude Desktop

Copy the example config, replacing the path with your local checkout:

```bash
mkdir -p ~/.config/claude-desktop

# macOS / Linux:
sed "s|__REPLACE_WITH_ABSOLUTE_PATH__|$(pwd)/..| " \
  ../claude-desktop-config.example.json \
  > ~/.config/claude-desktop/claude_desktop_config.json
```

Or manually create `~/.config/claude-desktop/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "reversi-game": {
      "command": "node",
      "args": [
        "/Users/YOU/Downloads/REVERSI/backend/dist/backend/src/mcp/mcp-stdio.js"
      ],
      "env": {
        "REVERSI_API": "http://localhost:3001"
      }
    }
  }
}
```

## 5. Restart Claude Desktop

Quit (⌘Q) and re-open. In Settings → Developer you should see **reversi-game** listed.

## 6. Play!

Type in Claude Desktop:

> I want to play Reversi. Create a room for me.

Claude will call `createRoom`, display the board, and start playing.

---

## Available MCP Tools

| Tool | Description |
|------|-------------|
| `listRooms` | List active game rooms |
| `createRoom` | Create room & auto-join as Black |
| `joinRoom` | Join an existing room |
| `leaveRoom` | Leave the current room |
| `getGameState` | Full board, scores, turn info |
| `getValidMoves` | Legal moves for current player |
| `makeMove` | Place a piece at (row, col) |
| `passTurn` | Skip turn (no legal moves) |
| `getHint` | Engine-suggested best move |
| `resignGame` | Forfeit the game |

---

## Typical game flow

```
Claude → createRoom("My Game")          → room created, joined as Black
Human  → (joins via browser)            → game starts automatically
Claude → getGameState(roomId)           → sees board + valid moves
Claude → makeMove(roomId, 2, 3)         → places piece, gets new board
        ← waits for human's move →
Claude → getGameState(roomId)           → sees updated board
Claude → getHint(roomId)               → engine suggests best play
Claude → makeMove(roomId, 4, 5)         → plays again
        … repeat until gameOver …
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Claude can't find server | Check config path. Restart Claude Desktop. |
| "Connection refused" | Make sure backend is running on port 3001. |
| Tool call error | Run `curl http://localhost:3001/mcp/tools` to verify. |
| TypeScript errors | Run `cd backend && npm run build` to recompile. |

## Files

| File | Purpose |
|------|---------|
| `backend/src/mcp/mcp.module.ts` | NestJS module (imports controller + service) |
| `backend/src/mcp/mcp.service.ts` | Tool definitions + implementations using real game engine |
| `backend/src/mcp/mcp.controller.ts` | HTTP endpoints (JSON-RPC + REST) |
| `backend/src/mcp/mcp-stdio.ts` | Stdio bridge for Claude Desktop |
| `claude-desktop-config.example.json` | Example Claude Desktop configuration |
