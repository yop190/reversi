/**
 * Score Module
 * Handles player scores and leaderboard using Azure Table Storage
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { AzureTableService } from './azure-table.service';

@Module({
  imports: [ConfigModule],
  controllers: [ScoreController],
  providers: [ScoreService, AzureTableService],
  exports: [ScoreService],
})
export class ScoreModule {}
