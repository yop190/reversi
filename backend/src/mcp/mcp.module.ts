import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { GameModule } from '../game/game.module';

/**
 * MCP REST module — imports GameModule so that McpService
 * operates on the **same** RoomService / GameService / PlayerService
 * singletons shared with the WebSocket gateway.
 */
@Module({
  imports: [GameModule],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
