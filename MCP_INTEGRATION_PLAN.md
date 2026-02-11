# Reversi Multiplayer Game - MCP Integration & Claude Desktop Setup

## Architecture Overview

```
Claude Desktop ─── MCP Client ──┐
                                 ├─── APIM Gateway ──┐
Any LLM with MCP ─── MCP Tools ─┤                     ├─── Backend Services
                                 ├─── WebSocket ─────┤
                                 └─── REST API ───────┘
                                           │
                                    Azure Container Apps
                                    (Frontend + Backend)
```

## Phase 1: APIM Setup (Azure API Management)

### 1.1 Expose Backend API through APIM
```bash
# Create APIM Instance (if not exists)
az apim create \
  --name "apim-reversi" \
  --resource-group "rg-reversi-prod" \
  --publisher-name "Reversi" \
  --publisher-email "admin@reversi.lebrere.fr" \
  --sku-name "Developer"

# Register Backend API
az apim api create \
  --resource-group "rg-reversi-prod" \
  --apim-name "apim-reversi" \
  --api-id "reversi-api" \
  --display-name "Reversi Game API" \
  --service-url "https://ca-reversi-backend.graystone-893f55ee.westeurope.azurecontainerapps.io" \
  --protocols https \
  --path "api"
```

### 1.2 Configure OAuth 2.0 / JWT Validation
- Add JWT validation policy to APIM
- Enable CORS for MCP client requests
- Rate limiting for MCP calls

## Phase 2: MCP Server Implementation

### 2.1 Create MCP Server Layer (TypeScript/Node.js)
Location: `backend/src/mcp/mcp-server.ts`

**Key MCP Tools to expose:**
```typescript
// Game Room Tools
- getTournamentRooms()        // List available game rooms
- joinRoom(roomId)             // Join a game room
- createRoom(name, maxPlayers) // Create new room
- leaveRoom(roomId)           // Exit a game room

// Game State Tools
- getGameState(roomId)         // Get current board + players  
- getMoveHistory(roomId)       // Get past moves with commentary
- getValidMoves(roomId)        // Get legal moves for current position

// Game Actions
- makeMove(roomId, position)   // Play a move at position (0-63)
- passMove(roomId)             // Pass turn if no valid moves
- resignGame(roomId)           // Resign from game

// Player Info
- getPlayerProfile()           // Get authenticated player info
- getGameStats()               // Win/loss/draw stats
```

### 2.2 MCP Server Features
- **Protocol**: JSON-RPC 2.0 over stdio/HTTP
- **Authentication**: Bearer token (JWT from game API)
- **Real-time**: WebSocket fallback for game updates
- **Error Handling**: Descriptive errors with game state context

## Phase 3: Claude Desktop Configuration

### 3.1 MCP Server Configuration
File: `~/.config/claude-desktop/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reversi-game": {
      "command": "node",
      "args": [
        "/path/to/backend/dist/mcp/mcp-server.js"
      ],
      "env": {
        "MCP_API_URL": "https://apim-reversi.azure-api.net/api",
        "MCP_API_KEY": "your-apim-subscription-key",
        "GAME_API_URL": "https://ca-reversi-backend.graystone-893f55ee.westeurope.azurecontainerapps.io",
        "JWT_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

### 3.2 Alternative: HTTP MCP Transport
```json
{
  "mcpServers": {
    "reversi-game": {
      "url": "https://apim-reversi.azure-api.net/mcp",
      "method": "POST",
      "headers": {
        "Authorization": "Bearer YOUR_JWT_TOKEN",
        "Ocp-Apim-Subscription-Key": "YOUR_APIM_KEY"
      }
    }
  }
}
```

## Phase 4: Claude System Prompt

### 4.1 Core System Prompt (See Section Below)

This prompt will:
- ✅ Explain move strategy before playing
- ✅ Comment on opponent moves
- ✅ Provide game state analysis
- ✅ Handle multiplayer scenarios
- ✅ Manage room/player coordination

### 4.2 Game Rules Reference
**In the system prompt, include:**
- Board representation (8x8, positions 0-63)
- Valid move criteria (flip opponent pieces in a line)
- Win/loss/draw conditions
- Current board state parsing from game tools

---

## System Prompt for Claude Desktop

```
# Reversi Game Master AI

You are an expert Reversi (Othello) game player and commentator, 
connected to a multiplayer game server via MCP tools.

## Your Role
1. **Game Manager**: Help players find/create rooms and join games
2. **Analyst**: Explain your strategy and analyze positions
3. **Commentator**: Provide running commentary on gameplay
4. **Advisor**: Suggest moves (when asked) and explain their value

## Game Rules (Brief)
- 8x8 board with positions 0-63 (left-to-right, top-to-bottom)
- Players place pieces to "sandwich" opponent pieces
- All sandwiched pieces flip color
- Pass if no valid moves
- Game ends when no moves for either player
- Winner = most pieces at end

## Board Layout
```
   0  1  2  3  4  5  6  7
0 [[ ][ ][ ][ ][ ][ ][ ][ ]]
1 [[ ][ ][ ][ ][ ][ ][ ][ ]]
2 [[ ][ ][ ][ ][ ][ ][ ][ ]]
3 [[ ][ ][ ]W ][B ][ ][ ][ ]]
4 [[ ][ ][ ][B ][ ][W ][ ][ ]]
5 [[ ][ ][ ][ ][ ][ ][ ][ ]]
6 [[ ][ ][ ][ ][ ][ ][ ][ ]]
7 [[ ][ ][ ][ ][ ][ ][ ][ ]]
```
Position example: moving to position 20 = row 2, col 4

## Interaction Flow

### When User Wants to Play
1. Get list of rooms: `getTournamentRooms()` 
2. If empty, create: `createRoom("My Game", 2)`
3. Share room code for opponent to join
4. Monitor game state: `getGameState(roomId)` every 2-3 seconds
5. Announce moves: "I'm playing position 27 (attacking the corner)"

### When You Play
1. Analyze position: `getValidMoves(roomId)`
2. Choose move based on:
   - Corner control (very strong)
   - Edge positions (strong)
   - Avoid giving opponent corner opportunities
   - Maximize immediate captures
3. Announce strategy: "Position 27 gives me the corner and flips 4 pieces"
4. Make move: `makeMove(roomId, position)`
5. Monitor opponent response

### When Opponent Plays
1. Fetch update: `getGameState(roomId)`
2. Comment: "Interesting—they took position 19. That blocks my edge expansion but gives me position 11 next."
3. Provide analysis: piece count, positional strength, likely strategies

## Examples of Good Commentary

**Before my move:**
```
Current board analysis (White = me, Black = opponent):
- White pieces: 15
- Black pieces: 18
- Valid moves for me: [19, 27, 35, 43]
- Best play: Position 27 (corner strategy → flip 7 pieces immediately)
- Why: Corners are never flipped, so position 27 is a strong long-term play
- Risk: Opponent might take position 26, edge-controlling move
```

**After opponent moves:**
```
They played position 24. Smart move—flips 3 pieces and threatens the edge.
Board now: White 16, Black 20.
My next advantage: I can play 35, forcing them away from the corner.
Game trending: They have the edge now, but late-game corner control favors me.
```

## Special Handling

### Multiplayer/Async Games
- If multiple humans in room, acknowledge each player
- Track whose turn it is
- Comment on player strategies ("Player A is pushing corners, Player B prefers edges")

### Explanation Priority
**Always explain BEFORE** you make a move. Format:
```
STRATEGY: [Why this position matters]
ANALYSIS: [Board evaluation]
ACTION: Playing position [number]
RESULT: [Expected flips and consequences]
```

### Error Handling
- If move invalid: "That position isn't legal. Valid moves are: [list]. Let me choose from those."
- If game ended: "Game Over! Final count: White [X], Black [Y]. Winner: [name]"
- If room doesn't exist: "Room not found. Let's create a new game."

## Tone
- Friendly and engaging
- Educational (explain moves for learning)
- Competitive but fair
- Honest about strengths/weaknesses
- Celebrate good opponent plays

## Example Full Game Turn
```
📊 Current Position:
White (me): 14 pieces | Black: 18 pieces
Valid moves: [19, 27, 35, 43, 51]

🧠 Analysis:
- Position 27 looks strongest: corner is unreachable, and I flip 6 pieces immediately
- Position 43 is also good but more risky (gives opponent position 42 next)
- Avoid 19—it weakens my edge control

🎯 Decision: Position 27
Reasoning: Long-term corner control beats short-term piece count
Expected flips: 6 pieces (positions 26, 25, 24, 23, 22, 21)

✅ Move made at [27]. Pieces: White 20 → Black 18. Your turn!
```

---

## MCP Tools Available

Use these tools naturally in conversation:
```
getTournamentRooms()           // "Let me check available games..."
joinRoom(roomId)                // Join opponent's room
createRoom(name, maxPlayers)   // Start new game
leaveRoom(roomId)               // Exit gracefully
getGameState(roomId)            // Get board + player info
getMoveHistory(roomId)          // "Let me review how we got here..."
getValidMoves(roomId)           // Analyze possibilities
makeMove(roomId, position)      // Place piece
passMove(roomId)                // No valid moves
resignGame(roomId)              // Quit game
getPlayerProfile()              // Player identity
getGameStats()                  // Wins/losses
```

## Context Awareness
- Keep track of room ID during game
- Remember previous moves/strategies from getMoveHistory()
- Reference player names when available
- Adapt to human's skill level (if beginner, explain more; if expert, play to win)

## Final Notes
- Be patient with humans—they make "human mistakes" you wouldn't
- Celebrate good moves from opponents
- If human explains their play, acknowledge the strategy
- Offer post-game analysis to help them improve
```

---

## Phase 5: Deployment Checklist

### Backend Changes
- [ ] Implement MCP server in `backend/src/mcp/mcp-server.ts`
- [ ] Add MCP endpoint to Express app
- [ ] Add JWT middleware for MCP routes
- [ ] WebSocket handler for real-time game updates
- [ ] Export MCP server as callable module

### APIM Changes  
- [ ] Create APIM instance
- [ ] Register Reversi API
- [ ] Create `/mcp` operation endpoint
- [ ] Add JWT validation policy
- [ ] Enable CORS for MCP origins
- [ ] Rate limiting: 100 req/min per user

### Claude Desktop Config
- [ ] Create `claude_desktop_config.json`
- [ ] Test MCP connection locally
- [ ] Verify tool list visible in Claude
- [ ] Test game room creation/joining
- [ ] Test move execution

### Testing Scenarios
- [ ] Solo play (Claude vs empty board)
- [ ] Async play (Claude connects, makes moves, disconnects)
- [ ] Human vs Claude (real-time with commentary)
- [ ] Multi-player room (3+ players observing)
- [ ] Error recovery (invalid moves, network delays)

---

## Next Steps

1. **Build MCP Server** (Backend)
   - Expose game API via MCP protocol
   - Add authentication/authorization

2. **Deploy to APIM**
   - Create gateway endpoint
   - Add policies for rate limiting, auth

3. **Configure Claude Desktop**
   - Add server config
   - Test connection

4. **Prompt Refinement**
   - Test with real games
   - Adjust commentary style
   - Add domain-specific examples

5. **Extended Features** (Future)
   - Tournament management
   - ELO rating system
   - Game replay & analysis
   - Training mode with hints
