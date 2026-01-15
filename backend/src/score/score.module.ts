/**
 * Score Module
 * Handles player scores and leaderboard using Firebase/Firestore
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { FirestoreService } from './firestore.service';

@Module({
  imports: [ConfigModule],
  controllers: [ScoreController],
  providers: [ScoreService, FirestoreService],
  exports: [ScoreService],
})
export class ScoreModule {}
