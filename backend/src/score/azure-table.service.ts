/**
 * Azure Table Storage Service
 * Handles connection to Azure Table Storage for persistent score storage
 * Cost-effective, serverless, auto-scaling NoSQL storage
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TableClient, AzureNamedKeyCredential, TableEntity } from '@azure/data-tables';

export interface PlayerScore {
  partitionKey: string;  // 'scores'
  rowKey: string;        // userId
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
  score: number;
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
export class AzureTableService implements OnModuleInit {
  private readonly logger = new Logger(AzureTableService.name);
  private tableClient: TableClient | null = null;
  private isInitialized = false;

  // In-memory fallback when Azure Table Storage is not configured
  private inMemoryScores = new Map<string, PlayerScore>();

  private readonly PARTITION_KEY = 'scores';
  private readonly TABLE_NAME = 'playerscores';

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeTableStorage();
  }

  private async initializeTableStorage() {
    try {
      const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
      
      if (!connectionString) {
        this.logger.warn('AZURE_STORAGE_CONNECTION_STRING not configured. Using in-memory storage (scores will not persist across restarts).');
        return;
      }

      // Create table client from connection string
      this.tableClient = TableClient.fromConnectionString(connectionString, this.TABLE_NAME);

      // Create table if it doesn't exist
      try {
        await this.tableClient.createTable();
        this.logger.log('Table created successfully');
      } catch (error: any) {
        // Table already exists - that's fine
        if (error.statusCode !== 409) {
          throw error;
        }
      }

      this.isInitialized = true;
      this.logger.log('Azure Table Storage initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Azure Table Storage:', error);
      this.logger.warn('Using in-memory storage as fallback');
    }
  }

  /**
   * Get player score by user ID
   */
  async getPlayerScore(userId: string): Promise<PlayerScore | null> {
    if (this.isInitialized && this.tableClient) {
      try {
        const entity = await this.tableClient.getEntity<PlayerScore>(this.PARTITION_KEY, userId);
        return this.entityToPlayerScore(entity);
      } catch (error: any) {
        if (error.statusCode === 404) {
          return null;
        }
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
      partitionKey: this.PARTITION_KEY,
      rowKey: score.userId,
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

    if (this.isInitialized && this.tableClient) {
      try {
        await this.tableClient.upsertEntity(updatedScore as TableEntity<PlayerScore>, 'Replace');
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

    if (this.isInitialized && this.tableClient) {
      try {
        // Azure Table Storage doesn't support ORDER BY, so we fetch all and sort in memory
        const entities = this.tableClient.listEntities<PlayerScore>({
          queryOptions: { filter: `PartitionKey eq '${this.PARTITION_KEY}'` }
        });
        
        for await (const entity of entities) {
          scores.push(this.entityToPlayerScore(entity));
        }
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
   * Check if Azure Table Storage is connected
   */
  isConnected(): boolean {
    return this.isInitialized;
  }

  /**
   * Convert table entity to PlayerScore
   */
  private entityToPlayerScore(entity: TableEntity<PlayerScore>): PlayerScore {
    return {
      partitionKey: entity.partitionKey || this.PARTITION_KEY,
      rowKey: entity.rowKey || '',
      userId: entity.userId as string || entity.rowKey || '',
      googleId: entity.googleId as string || '',
      displayName: entity.displayName as string || 'Unknown',
      email: entity.email as string || '',
      photoUrl: entity.photoUrl as string | undefined,
      wins: Number(entity.wins) || 0,
      losses: Number(entity.losses) || 0,
      draws: Number(entity.draws) || 0,
      totalGames: Number(entity.totalGames) || 0,
      winRate: Number(entity.winRate) || 0,
      score: Number(entity.score) || 0,
      lastGameAt: Number(entity.lastGameAt) || 0,
      createdAt: Number(entity.createdAt) || 0,
      updatedAt: Number(entity.updatedAt) || 0,
    };
  }
}
