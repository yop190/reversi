/**
 * Score Service
 * Business logic for player scores and leaderboard
 */

import { Injectable, Logger } from '@nestjs/common';
import { FirestoreService, PlayerScore, LeaderboardEntry } from './firestore.service';

export interface GameResult {
  winner: 'black' | 'white' | 'draw';
  blackPlayerId: string;
  whitePlayerId: string;
  blackScore: number;
  whiteScore: number;
}

// Points awarded for different game outcomes
const POINTS = {
  WIN: 10,
  DRAW: 3,
  LOSS: 1,
  PARTICIPATION: 1,
};

@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);

  constructor(private firestoreService: FirestoreService) {}

  /**
   * Record game result and update scores
   * Only the backend can call this - ensures score integrity
   */
  async recordGameResult(result: GameResult): Promise<{
    blackPlayerScore: PlayerScore;
    whitePlayerScore: PlayerScore;
  }> {
    const now = Date.now();

    // Get or create player scores
    const [blackScore, whiteScore] = await Promise.all([
      this.getOrCreatePlayerScore(result.blackPlayerId),
      this.getOrCreatePlayerScore(result.whitePlayerId),
    ]);

    // Update scores based on result
    if (result.winner === 'black') {
      blackScore.wins++;
      blackScore.score += POINTS.WIN;
      whiteScore.losses++;
      whiteScore.score += POINTS.LOSS;
    } else if (result.winner === 'white') {
      whiteScore.wins++;
      whiteScore.score += POINTS.WIN;
      blackScore.losses++;
      blackScore.score += POINTS.LOSS;
    } else {
      // Draw
      blackScore.draws++;
      blackScore.score += POINTS.DRAW;
      whiteScore.draws++;
      whiteScore.score += POINTS.DRAW;
    }

    // Update total games and last game time
    blackScore.totalGames++;
    blackScore.lastGameAt = now;
    whiteScore.totalGames++;
    whiteScore.lastGameAt = now;

    // Persist updates
    const [updatedBlack, updatedWhite] = await Promise.all([
      this.firestoreService.upsertPlayerScore(blackScore),
      this.firestoreService.upsertPlayerScore(whiteScore),
    ]);

    this.logger.log(`Game result recorded: ${result.winner} wins`);

    return {
      blackPlayerScore: updatedBlack,
      whitePlayerScore: updatedWhite,
    };
  }

  /**
   * Get player score by user ID
   */
  async getPlayerScore(userId: string): Promise<PlayerScore | null> {
    return this.firestoreService.getPlayerScore(userId);
  }

  /**
   * Get or create player score
   */
  async getOrCreatePlayerScore(userId: string): Promise<PlayerScore> {
    const existing = await this.firestoreService.getPlayerScore(userId);
    if (existing) {
      return existing;
    }

    // Create new score
    return this.firestoreService.upsertPlayerScore({
      userId,
      wins: 0,
      losses: 0,
      draws: 0,
      totalGames: 0,
      score: 0,
    });
  }

  /**
   * Update player profile (name, photo)
   */
  async updatePlayerProfile(
    userId: string,
    profile: { displayName?: string; photoUrl?: string; email?: string; googleId?: string }
  ): Promise<PlayerScore> {
    return this.firestoreService.upsertPlayerScore({
      userId,
      ...profile,
    });
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    return this.firestoreService.getLeaderboard(limit);
  }

  /**
   * Get player's rank in global leaderboard
   */
  async getPlayerRank(userId: string): Promise<number | null> {
    return this.firestoreService.getPlayerRank(userId);
  }

  /**
   * Get player score with rank
   */
  async getPlayerScoreWithRank(userId: string): Promise<{
    score: PlayerScore | null;
    rank: number | null;
  }> {
    const [score, rank] = await Promise.all([
      this.getPlayerScore(userId),
      this.getPlayerRank(userId),
    ]);

    return { score, rank };
  }

  /**
   * Check if storage is persistent (Firestore) or in-memory
   */
  isPersistent(): boolean {
    return this.firestoreService.isConnected();
  }
}
