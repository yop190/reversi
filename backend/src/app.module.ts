import { Module } from '@nestjs/common';
import { GameGateway } from './game/game.gateway';
import { RoomService } from './game/room.service';
import { GameService } from './game/game.service';
import { PlayerService } from './game/player.service';
import { HealthController } from './health.controller';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [GameGateway, RoomService, GameService, PlayerService],
})
export class AppModule {}
