import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';

/**
 * Shared GameModule — provides singleton instances of the core
 * game services so that WebSocket gateway and MCP REST controller
 * operate on the **same** in-memory state.
 */
@Module({
  providers: [RoomService, GameService, PlayerService],
  exports: [RoomService, GameService, PlayerService],
})
export class GameModule {}
