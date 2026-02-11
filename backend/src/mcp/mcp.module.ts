import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { RoomService } from '../game/room.service';
import { GameService } from '../game/game.service';
import { PlayerService } from '../game/player.service';

@Module({
  controllers: [McpController],
  providers: [McpService, RoomService, GameService, PlayerService],
  exports: [McpService],
})
export class McpModule {}
