# Multiplayer Reversi

This document describes the real-time multiplayer functionality added to the Reversi game.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Multiplayer Architecture                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────┐                    ┌─────────────────────────┐ │
│  │  Angular Client │◄──── Socket.IO ────►│  NestJS WebSocket Server│ │
│  │   (Frontend)    │                    │       (Backend)         │ │
│  └────────┬────────┘                    └────────────┬────────────┘ │
│           │                                          │               │
│           ▼                                          ▼               │
│  ┌─────────────────┐                    ┌─────────────────────────┐ │
│  │ WebSocketService│                    │      GameGateway        │ │
│  │   (Angular)     │                    │       (NestJS)          │ │
│  └─────────────────┘                    └────────────┬────────────┘ │
│                                                      │               │
│                                         ┌────────────┼────────────┐ │
│                                         ▼            ▼            ▼ │
│                                    ┌────────┐  ┌──────────┐  ┌─────┐│
│                                    │ Player │  │  Room    │  │Game ││
│                                    │Service │  │ Service  │  │Svc  ││
│                                    └────────┘  └──────────┘  └─────┘│
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Shared Game Engine                         │  │
│  │  Pure TypeScript - Used by both frontend and backend           │  │
│  │  • Board state management    • Move validation                 │  │
│  │  • Flipping logic           • Score calculation                │  │
│  │  • Win condition detection  • AI hints                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Features

### 🎮 Game Modes
- **Single Player**: Play against AI with adjustable difficulty
- **Multiplayer**: Real-time online play against other players

### 🏠 Lobby System
- Browse available game rooms
- Create new rooms with custom names
- Quick join to find an available game
- See player count and room status

### 👥 Room Features
- 2 players per game
- Unlimited spectators
- Real-time game state synchronization
- Player color assignment (Black goes first)
- Room persistence during disconnects

### 🔄 Real-time Features
- Instant move synchronization
- Live score updates
- Turn indicators
- Game over detection
- Rematch functionality

## Project Structure

```
REVERSI/
├── shared/                      # Shared code (frontend + backend)
│   ├── game.types.ts           # TypeScript types & interfaces
│   ├── game-engine.ts          # Pure game logic
│   └── index.ts                # Barrel export
│
├── backend/                     # NestJS WebSocket Server
│   ├── src/
│   │   ├── main.ts             # Server bootstrap
│   │   ├── app.module.ts       # Root module
│   │   ├── health.controller.ts # Health check endpoint
│   │   └── game/
│   │       ├── game.gateway.ts  # WebSocket event handlers
│   │       ├── game.service.ts  # Game logic wrapper
│   │       ├── room.service.ts  # Room/lobby management
│   │       └── player.service.ts # Player session management
│   ├── package.json
│   └── tsconfig.json
│
├── src/app/                     # Angular Frontend
│   ├── services/
│   │   └── websocket.service.ts # Socket.IO client
│   └── components/
│       ├── lobby/               # Lobby UI
│       ├── game-room/           # Game room UI
│       └── multiplayer-board/   # Server-synced board
│
├── Dockerfile                   # Frontend container
├── nginx.conf                   # Nginx configuration
├── docker-compose.yml           # Production compose
├── docker-compose.dev.yml       # Development compose
└── package.json
```

## Getting Started

### Development Mode

#### Option 1: Run locally

```bash
# Terminal 1: Start the backend
cd backend
npm install
npm run start:dev

# Terminal 2: Start the frontend
npm install
npm start
```

#### Option 2: Run with Docker

```bash
docker compose -f docker-compose.dev.yml up
```

### Production Mode

```bash
# Build and run with Docker Compose
docker compose up --build

# Or build images separately
docker build -t reversi-frontend .
docker build -t reversi-backend ./backend
```

## WebSocket Events

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `setUsername` | `{ username: string }` | Set player display name |
| `createRoom` | `{ name?: string }` | Create a new game room |
| `joinRoom` | `{ roomId: string }` | Join an existing room |
| `leaveRoom` | - | Leave current room |
| `makeMove` | `{ row: number, col: number }` | Make a move on the board |
| `passTurn` | - | Pass turn when no moves available |
| `requestHint` | - | Request AI hint for best move |
| `restartGame` | - | Restart the current game |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ playerId, message }` | Connection established |
| `lobbyUpdate` | `LobbyState` | Lobby state changed |
| `roomJoined` | `{ room, yourColor, isSpectator }` | Successfully joined room |
| `gameStarted` | `{ message }` | Game has started |
| `gameStateUpdate` | `GameState` | Game state changed |
| `playerJoined` | `{ player, message }` | Player joined room |
| `playerLeft` | `{ playerId, message }` | Player left room |
| `gameOver` | `{ winner, blackScore, whiteScore }` | Game ended |
| `hintResponse` | `{ position }` | Hint position response |
| `error` | `{ code, message }` | Error occurred |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend server port |
| `NODE_ENV` | `development` | Environment mode |

### Frontend Configuration

The WebSocket server URL is configured in `websocket.service.ts`:

```typescript
private readonly serverUrl = 'http://localhost:3001';
```

For production, this should be updated to use environment-specific configuration.

## Docker Configuration

### Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | Nginx serving Angular app |
| Backend | 3001 | NestJS WebSocket server |

### Networks

All services run on the `reversi-network` bridge network.

### Health Checks

Both services include health check endpoints:
- Frontend: `GET /health` (Nginx)
- Backend: `GET /health` (NestJS)

## Technical Details

### Game State Synchronization

1. Client sends move to server
2. Server validates move using shared game engine
3. Server updates game state
4. Server broadcasts updated state to all clients in room
5. Clients update their local state

### Error Handling

The WebSocket service handles:
- Connection failures with auto-reconnect
- Invalid moves with error messages
- Player disconnections with state cleanup
- Network interruptions with graceful degradation

### Security Considerations

- All game logic runs server-side (authoritative server)
- Moves are validated before processing
- Room access is controlled by room service
- CORS is configured for allowed origins

## Future Improvements

- [ ] Persistent game state (database)
- [ ] Player authentication
- [ ] Game history and replay
- [ ] ELO rating system
- [ ] Tournament mode
- [ ] Chat functionality
- [ ] Mobile-optimized touch controls
- [ ] Reconnection to ongoing games
