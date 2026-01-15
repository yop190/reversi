# Scoring System Documentation

## Overview

The Reversi application uses a persistent scoring system backed by Google Cloud Firestore. Scores are:
- Linked to authenticated users
- Stored persistently
- Managed exclusively by the backend
- Displayed on a global leaderboard

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│   Firestore  │
│   (Angular)  │     │   (NestJS)   │     │   (Google)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       │ GET /scores/       │                    │
       │ leaderboard        │                    │
       │───────────────────▶│                    │
       │                    │ Query scores       │
       │                    │───────────────────▶│
       │                    │                    │
       │                    │ Sorted by score    │
       │                    │◀───────────────────│
       │                    │                    │
       │ Leaderboard data   │                    │
       │◀───────────────────│                    │
```

## Scoring Rules

### Points System

| Outcome | Points Awarded |
|---------|---------------|
| Win | 10 points |
| Draw | 3 points |
| Loss | 1 point |

### Score Calculation

After each multiplayer game:

```typescript
if (winner === 'black') {
  blackPlayer.score += 10; // WIN
  blackPlayer.wins++;
  whitePlayer.score += 1;  // LOSS
  whitePlayer.losses++;
} else if (winner === 'white') {
  whitePlayer.score += 10; // WIN
  whitePlayer.wins++;
  blackPlayer.score += 1;  // LOSS
  blackPlayer.losses++;
} else {
  blackPlayer.score += 3;  // DRAW
  blackPlayer.draws++;
  whitePlayer.score += 3;  // DRAW
  whitePlayer.draws++;
}
```

## Data Model

### PlayerScore

```typescript
interface PlayerScore {
  userId: string;       // Unique user ID
  googleId: string;     // Google OAuth ID
  displayName: string;  // Player's name
  email: string;        // Player's email
  photoUrl?: string;    // Profile picture
  wins: number;         // Total wins
  losses: number;       // Total losses
  draws: number;        // Total draws
  totalGames: number;   // Total games played
  winRate: number;      // Win percentage (0-100)
  score: number;        // Total score points
  lastGameAt: number;   // Timestamp of last game
  createdAt: number;    // Account creation time
  updatedAt: number;    // Last update time
}
```

### LeaderboardEntry

```typescript
interface LeaderboardEntry {
  rank: number;         // Position on leaderboard
  userId: string;       // User ID
  displayName: string;  // Player's name
  photoUrl?: string;    // Profile picture
  wins: number;         // Total wins
  totalGames: number;   // Total games
  winRate: number;      // Win percentage
  score: number;        // Total score
}
```

## API Endpoints

### GET /scores/leaderboard

Returns the global leaderboard.

**Request:**
```http
GET /scores/leaderboard?limit=50
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "userId": "user_12345",
      "displayName": "Champion",
      "photoUrl": "https://...",
      "wins": 50,
      "totalGames": 60,
      "winRate": 83,
      "score": 520
    }
  ],
  "isPersistent": true,
  "timestamp": 1642000000000
}
```

### GET /scores/me

Returns the current user's score and rank.

**Request:**
```http
GET /scores/me
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "score": {
    "userId": "user_12345",
    "displayName": "Player",
    "wins": 10,
    "losses": 5,
    "draws": 2,
    "totalGames": 17,
    "winRate": 59,
    "score": 120
  },
  "rank": 42,
  "isPersistent": true
}
```

### GET /scores/player/:userId

Returns a specific player's score.

**Request:**
```http
GET /scores/player/user_12345
Authorization: Bearer <jwt-token>
```

## Security

### Backend-Only Score Updates

- ✅ Backend records game results
- ✅ Backend calculates scores
- ❌ Client cannot modify scores
- ❌ Client cannot fake game results

```typescript
// Only called by backend after game ends
async recordGameResult(result: GameResult) {
  // Backend validates game was legitimate
  // Backend calculates and stores scores
  await this.firestoreService.upsertPlayerScore(updatedScore);
}
```

### Authentication Required

All score endpoints require a valid JWT token:

```typescript
@Controller('scores')
export class ScoreController {
  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)  // Requires authentication
  async getLeaderboard() { ... }
}
```

## Storage: Google Cloud Firestore

### Why Firestore?

- ✅ Low cost (free tier generous)
- ✅ Serverless (no management)
- ✅ Auto-scaling
- ✅ Real-time capable
- ✅ Easy integration with Google OAuth

### Collection Structure

```
player_scores/
  ├── user_12345/
  │   ├── userId: "user_12345"
  │   ├── displayName: "Player 1"
  │   ├── wins: 10
  │   ├── score: 120
  │   └── ...
  ├── user_67890/
  │   └── ...
```

### Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /player_scores/{userId} {
      // Only backend (service account) can read/write
      allow read, write: if false;
    }
  }
}
```

Note: All access is via the backend service account, not client-side.

## Fallback: In-Memory Storage

If Firestore is not configured, the system falls back to in-memory storage:

```typescript
if (!firestoreConfigured) {
  logger.warn('Using in-memory storage (scores will not persist)');
  // Scores stored in Map, lost on restart
}
```

Check storage status:
```http
GET /scores/health

{
  "status": "ok",
  "isPersistent": true,
  "storage": "firestore"
}
```

## Leaderboard Component

The frontend displays the leaderboard:

```html
<app-leaderboard></app-leaderboard>
```

Features:
- Top 50 players
- Current user highlighted
- User's rank shown
- Auto-refresh capability
- Loading and error states

## Cost Optimization

Firestore pricing (as of 2024):
- 50,000 reads/day free
- 20,000 writes/day free
- 20,000 deletes/day free
- 1 GB storage free

For Reversi:
- ~2 writes per game (2 players)
- ~1-5 reads per leaderboard view
- Estimated: Well within free tier for moderate usage
