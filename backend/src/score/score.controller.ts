/**
 * Score Controller
 * REST endpoints for player scores and leaderboard
 * All endpoints require authentication
 */

import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ScoreService } from './score.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Controller('scores')
export class ScoreController {
  constructor(private scoreService: ScoreService) {}

  /**
   * Get global leaderboard
   */
  @Get('leaderboard')
  @UseGuards(JwtAuthGuard)
  async getLeaderboard(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 100;
    const validLimit = Math.min(Math.max(parsedLimit, 1), 100);
    
    const leaderboard = await this.scoreService.getLeaderboard(validLimit);
    
    return {
      leaderboard,
      isPersistent: this.scoreService.isPersistent(),
      timestamp: Date.now(),
    };
  }

  /**
   * Get current user's score and rank
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyScore(@CurrentUser() user: AuthenticatedUser) {
    // Ensure user profile is up to date
    await this.scoreService.updatePlayerProfile(user.id, {
      displayName: user.displayName,
      email: user.email,
      googleId: user.googleId,
      photoUrl: user.photoUrl,
    });

    const { score, rank } = await this.scoreService.getPlayerScoreWithRank(user.id);

    return {
      score,
      rank,
      isPersistent: this.scoreService.isPersistent(),
    };
  }

  /**
   * Get a specific player's score
   */
  @Get('player/:userId')
  @UseGuards(JwtAuthGuard)
  async getPlayerScore(@Param('userId') userId: string) {
    const { score, rank } = await this.scoreService.getPlayerScoreWithRank(userId);

    if (!score) {
      return {
        score: null,
        rank: null,
        message: 'Player has not played any games yet',
      };
    }

    return {
      score: {
        userId: score.userId,
        displayName: score.displayName,
        photoUrl: score.photoUrl,
        wins: score.wins,
        losses: score.losses,
        draws: score.draws,
        totalGames: score.totalGames,
        winRate: score.winRate,
        score: score.score,
      },
      rank,
    };
  }

  /**
   * Health check for score service
   */
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      isPersistent: this.scoreService.isPersistent(),
      storage: this.scoreService.isPersistent() ? 'firestore' : 'in-memory',
    };
  }
}
