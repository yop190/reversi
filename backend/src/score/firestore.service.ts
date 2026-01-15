/**
 * Firestore Service
 * Handles connection to Google Cloud Firestore for persistent storage
 * Low-cost, serverless, auto-scaling NoSQL database
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PlayerScore {
  odataId: string;
  odataEtag?: string;
  userId: string;
  googleId: string;
  displayName: string;
  email: string;
  photoUrl?: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  score: number; // Total score points
  lastGameAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  photoUrl?: string;
  wins: number;
  totalGames: number;
  winRate: number;
  score: number;
}

@Injectable()
export class FirestoreService implements OnModuleInit {
  private readonly logger = new Logger(FirestoreService.name);
  private firestore: any = null;
  private scoresCollection: any = null;
  private isInitialized = false;

  // In-memory fallback when Firestore is not configured
  private inMemoryScores = new Map<string, PlayerScore>();

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeFirestore();
  }

  private async initializeFirestore() {
    try {
      const serviceAccountJson = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT');
      
      if (!serviceAccountJson) {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT not configured. Using in-memory storage (scores will not persist across restarts).');
        return;
      }

      const { Firestore } = await import('@google-cloud/firestore');
      const serviceAccount = JSON.parse(serviceAccountJson);

      this.firestore = new Firestore({
        projectId: serviceAccount.project_id,
        credentials: {
          client_email: serviceAccount.client_email,
          private_key: serviceAccount.private_key,
        },
      });

      this.scoresCollection = this.firestore.collection('player_scores');
      this.isInitialized = true;
      
      this.logger.log('Firestore initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Firestore:', error);
      this.logger.warn('Using in-memory storage as fallback');
    }
  }

  /**
   * Get player score by user ID
   */
  async getPlayerScore(userId: string): Promise<PlayerScore | null> {
    if (this.isInitialized && this.scoresCollection) {
      try {
        const doc = await this.scoresCollection.doc(userId).get();
        if (doc.exists) {
          return { odataId: doc.id, ...doc.data() } as PlayerScore;
        }
        return null;
      } catch (error) {
        this.logger.error('Error fetching player score:', error);
      }
    }
    
    // Fallback to in-memory
    return this.inMemoryScores.get(userId) || null;
  }

  /**
   * Create or update player score
   */
  async upsertPlayerScore(score: Partial<PlayerScore> & { userId: string }): Promise<PlayerScore> {
    const now = Date.now();
    const existingScore = await this.getPlayerScore(score.userId);
    
    const updatedScore: PlayerScore = {
      odataId: score.userId,
      userId: score.userId,
      googleId: score.googleId || existingScore?.googleId || '',
      displayName: score.displayName || existingScore?.displayName || 'Unknown',
      email: score.email || existingScore?.email || '',
      photoUrl: score.photoUrl || existingScore?.photoUrl,
      wins: score.wins ?? existingScore?.wins ?? 0,
      losses: score.losses ?? existingScore?.losses ?? 0,
      draws: score.draws ?? existingScore?.draws ?? 0,
      totalGames: score.totalGames ?? existingScore?.totalGames ?? 0,
      winRate: 0, // Calculated below
      score: score.score ?? existingScore?.score ?? 0,
      lastGameAt: score.lastGameAt ?? existingScore?.lastGameAt ?? now,
      createdAt: existingScore?.createdAt ?? now,
      updatedAt: now,
    };

    // Calculate win rate
    updatedScore.winRate = updatedScore.totalGames > 0
      ? Math.round((updatedScore.wins / updatedScore.totalGames) * 100)
      : 0;

    if (this.isInitialized && this.scoresCollection) {
      try {
        await this.scoresCollection.doc(score.userId).set(updatedScore, { merge: true });
        return updatedScore;
      } catch (error) {
        this.logger.error('Error upserting player score:', error);
      }
    }

    // Fallback to in-memory
    this.inMemoryScores.set(score.userId, updatedScore);
    return updatedScore;
  }

  /**
   * Get global leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    let scores: PlayerScore[] = [];

    if (this.isInitialized && this.scoresCollection) {
      try {
        const snapshot = await this.scoresCollection
          .orderBy('score', 'desc')
          .limit(limit)
          .get();
        
        scores = snapshot.docs.map((doc: any) => ({
          odataId: doc.id,
          ...doc.data(),
        })) as PlayerScore[];
      } catch (error) {
        this.logger.error('Error fetching leaderboard:', error);
        // Fallback to in-memory
        scores = Array.from(this.inMemoryScores.values());
      }
    } else {
      // Use in-memory storage
      scores = Array.from(this.inMemoryScores.values());
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Map to leaderboard entries with rank
    return scores.slice(0, limit).map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      displayName: score.displayName,
      photoUrl: score.photoUrl,
      wins: score.wins,
      totalGames: score.totalGames,
      winRate: score.winRate,
      score: score.score,
    }));
  }

  /**
   * Get player rank
   */
  async getPlayerRank(userId: string): Promise<number | null> {
    const leaderboard = await this.getLeaderboard(1000);
    const entry = leaderboard.find(e => e.userId === userId);
    return entry?.rank ?? null;
  }

  /**
   * Check if Firestore is connected
   */
  isConnected(): boolean {
    return this.isInitialized;
  }
}
