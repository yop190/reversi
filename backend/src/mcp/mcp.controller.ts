import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { McpService, MCP_TOOLS } from './mcp.service';

// ─── DTOs ───────────────────────────────────────────────────────────────────

class CreateRoomDto {
  roomName!: string;
}

class MakeMoveDto {
  row!: number;
  col!: number;
}

// ─── Controller ─────────────────────────────────────────────────────────────

/**
 * Clean REST API for the Reversi game engine.
 *
 * Azure API Management imports this specification and maps each operation
 * to an MCP tool via its native MCP-gateway feature.  Claude Desktop
 * connects to APIM's MCP SSE endpoint – APIM translates MCP tool-calls
 * into these REST requests automatically.
 *
 * Route prefix: /api/game
 */
@Controller('api/game')
export class McpController {
  private readonly logger = new Logger(McpController.name);

  constructor(private readonly mcpService: McpService) {
    this.logger.log('Game API controller initialised – REST endpoints ready');
  }

  // ── helper ────────────────────────────────────────────────────────────────

  private wrap(fn: () => Record<string, unknown>) {
    try {
      return fn();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(msg);
      throw new HttpException(msg, HttpStatus.BAD_REQUEST);
    }
  }

  // ── MCP tool listing (kept for debugging / documentation) ─────────────

  /** GET /api/game/tools — list all MCP tool definitions */
  @Get('tools')
  listTools() {
    return {
      tools: MCP_TOOLS.map(t => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  }

  // ── Room management ───────────────────────────────────────────────────────

  /**
   * GET /api/game/rooms
   * @operationId listRooms
   * List all game rooms on the server.
   */
  @Get('rooms')
  listRooms(
    @Query('includeInProgress') includeInProgress?: string,
  ) {
    return this.wrap(() =>
      this.mcpService.listRooms({
        includeInProgress: includeInProgress !== 'false',
      }),
    );
  }

  /**
   * POST /api/game/rooms
   * @operationId createRoom
   * Create a new game room. The calling bot joins automatically as Black.
   */
  @Post('rooms')
  @HttpCode(201)
  createRoom(@Body() body: CreateRoomDto) {
    return this.wrap(() =>
      this.mcpService.createRoom({ roomName: body.roomName }),
    );
  }

  /**
   * POST /api/game/rooms/:roomId/join
   * @operationId joinRoom
   * Join an existing room as player or spectator.
   */
  @Post('rooms/:roomId/join')
  @HttpCode(200)
  joinRoom(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.joinRoom({ roomId }));
  }

  /**
   * POST /api/game/rooms/:roomId/leave
   * @operationId leaveRoom
   * Leave the specified room.
   */
  @Post('rooms/:roomId/leave')
  @HttpCode(200)
  leaveRoom(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.leaveRoom({ roomId }));
  }

  // ── Game state ────────────────────────────────────────────────────────────

  /**
   * GET /api/game/rooms/:roomId/state
   * @operationId getGameState
   * Return the full board, scores, current turn, and valid moves.
   */
  @Get('rooms/:roomId/state')
  getGameState(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.getGameState({ roomId }));
  }

  /**
   * GET /api/game/rooms/:roomId/valid-moves
   * @operationId getValidMoves
   * Return only the list of valid moves for the current player.
   */
  @Get('rooms/:roomId/valid-moves')
  getValidMoves(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.getValidMoves({ roomId }));
  }

  // ── Game actions ──────────────────────────────────────────────────────────

  /**
   * POST /api/game/rooms/:roomId/move
   * @operationId makeMove
   * Place a piece at (row, col). 0-indexed.
   */
  @Post('rooms/:roomId/move')
  @HttpCode(200)
  makeMove(
    @Param('roomId') roomId: string,
    @Body() body: MakeMoveDto,
  ) {
    return this.wrap(() =>
      this.mcpService.doMakeMove({ roomId, row: body.row, col: body.col }),
    );
  }

  /**
   * POST /api/game/rooms/:roomId/pass
   * @operationId passTurn
   * Pass (skip) the current turn when no legal moves exist.
   */
  @Post('rooms/:roomId/pass')
  @HttpCode(200)
  passTurn(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.doPassTurn({ roomId }));
  }

  /**
   * GET /api/game/rooms/:roomId/hint
   * @operationId getHint
   * Ask the engine for the best move suggestion.
   */
  @Get('rooms/:roomId/hint')
  getHint(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.doGetHint({ roomId }));
  }

  /**
   * POST /api/game/rooms/:roomId/resign
   * @operationId resignGame
   * Resign the game. The opponent wins.
   */
  @Post('rooms/:roomId/resign')
  @HttpCode(200)
  resignGame(@Param('roomId') roomId: string) {
    return this.wrap(() => this.mcpService.doResignGame({ roomId }));
  }
}
