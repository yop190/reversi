import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game/game.gateway';
import { RoomService } from './game/room.service';
import { GameService } from './game/game.service';
import { PlayerService } from './game/player.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { ScoreModule } from './score/score.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    ScoreModule,
  ],
  controllers: [HealthController],
  providers: [GameGateway, RoomService, GameService, PlayerService],
})
export class AppModule { }
