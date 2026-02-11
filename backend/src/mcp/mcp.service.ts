import { Injectable, Logger } from '@nestjs/common';
import { RoomService } from '../game/room.service';
import { GameService } from '../game/game.service';
import { PlayerService } from '../game/player.service';
import {
  PlayerColor,
  CellState,
  BOARD_SIZE,
  GameState,
  Position,
} from '../../../shared/game.types';
import {
  gameEvents,
  GAME_STATE_UPDATED,
  GAME_STARTED,
  GAME_OVER,
  PLAYER_JOINED,
  PLAYER_LEFT,
  TURN_PASSED,
} from '../game/game-events';

// ─── MCP Tool Definitions (JSON Schema) ─────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'listRooms',
    description:
      'List all game rooms currently open on the server. Returns room id, name, player count, and whether a game is in progress.',
    inputSchema: {
      type: 'object',
      properties: {
        includeInProgress: {
          type: 'boolean',
          description: 'If true, also return rooms where a game is already in progress (default true)',
        },
      },
      required: [],
    },
  },
  {
    name: 'createRoom',
    description:
      'Create a new game room. The MCP bot automatically joins as the first player (Black).',
    inputSchema: {
      type: 'object',
      properties: {
        roomName: {
          type: 'string',
          description: 'Display name for the room',
        },
      },
      required: ['roomName'],
    },
  },
  {
    name: 'joinRoom',
    description:
      'Join an existing room as a player (if a seat is free) or as a spectator. The MCP bot gets a playerColor back.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room to join' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'leaveRoom',
    description: 'Leave the room the bot is currently in.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room to leave' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'getGameState',
    description:
      'Return the full board (8×8), scores, whose turn it is, valid moves, and whether the game is over.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'getValidMoves',
    description:
      'Return the list of valid moves (row, col) for the current player.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'makeMove',
    description:
      'Place a piece at (row, col). Row and col are 0-indexed. Returns the new board state after flipping.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
        row: { type: 'number', description: 'Row index 0-7 (top=0)' },
        col: { type: 'number', description: 'Column index 0-7 (left=0)' },
      },
      required: ['roomId', 'row', 'col'],
    },
  },
  {
    name: 'passTurn',
    description:
      'Pass (skip) the current turn. Only valid when the active player has no legal moves.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'getHint',
    description:
      'Ask the server engine for the best move suggestion for the active player.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
      },
      required: ['roomId'],
    },
  },
  {
    name: 'resignGame',
    description: 'Resign from the current game. The opponent wins.',
    inputSchema: {
      type: 'object',
      properties: {
        roomId: { type: 'string', description: 'ID of the room' },
      },
      required: ['roomId'],
    },
  },
];

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * McpService wraps the real game services behind simple JSON-in / JSON-out
 * methods so they can be called from an HTTP controller (MCP transport).
 *
 * The bot is represented by a virtual socket-id so the existing RoomService
 * can manage it like any other player.
 */
@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);

  /** Virtual socket-id used to represent the MCP bot inside RoomService. */
  private readonly BOT_SOCKET_PREFIX = 'mcp-bot-';
  private botCounter = 0;

  constructor(
    private readonly roomService: RoomService,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Generate a unique virtual socket id for the MCP bot. */
  private nextBotId(): string {
    return `${this.BOT_SOCKET_PREFIX}${++this.botCounter}-${Date.now().toString(36)}`;
  }

  /** Pretty-print board for Claude's consumption. */
  private formatBoard(board: CellState[][]): string {
    const header = '  A B C D E F G H';
    const rows = board.map((row, ri) => {
      const cells = row.map(c =>
        c === CellState.Empty ? '·' : c === CellState.Black ? '●' : '○',
      );
      return `${ri + 1} ${cells.join(' ')}`;
    });
    return [header, ...rows].join('\n');
  }

  /** Build a summary object from an existing room. */
  private roomSummary(room: ReturnType<RoomService['getRoom']>) {
    if (!room) return null;
    return {
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      spectatorCount: room.spectators.length,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        color: p.color,
      })),
      inProgress: room.gameState !== null && !room.gameState?.gameOver,
      gameOver: room.gameState?.gameOver ?? false,
    };
  }

  /** Build a full game-state payload with formatted board. */
  private gamePayload(gs: GameState) {
    return {
      board: this.formatBoard(gs.board),
      boardRaw: gs.board,
      currentTurn: gs.currentTurn,
      blackScore: gs.blackScore,
      whiteScore: gs.whiteScore,
      gameOver: gs.gameOver,
      winner: gs.winner,
      lastMove: gs.lastMove,
      validMoves: gs.validMoves,
      validMoveCount: gs.validMoves.length,
    };
  }

  // ── tool dispatch ────────────────────────────────────────────────────────

  /**
   * Central dispatcher – called from the controller for every `tools/call`.
   */
  callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): { content: Array<{ type: 'text'; text: string }>; isError?: boolean } {
    try {
      const result = this.executeTool(toolName, args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Tool ${toolName} failed: ${message}`);
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      };
    }
  }

  private executeTool(
    name: string,
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    switch (name) {
      case 'listRooms':
        return this.listRooms(args);
      case 'createRoom':
        return this.createRoom(args);
      case 'joinRoom':
        return this.joinRoom(args);
      case 'leaveRoom':
        return this.leaveRoom(args);
      case 'getGameState':
        return this.getGameState(args);
      case 'getValidMoves':
        return this.getValidMoves(args);
      case 'makeMove':
        return this.doMakeMove(args);
      case 'passTurn':
        return this.doPassTurn(args);
      case 'getHint':
        return this.doGetHint(args);
      case 'resignGame':
        return this.doResignGame(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // ── tool implementations (public for REST controller) ─────────────────────

  listRooms(args: Record<string, unknown>) {
    const includeInProgress = args.includeInProgress !== false;
    const summaries = this.roomService.getRoomSummaries();
    const filtered = includeInProgress
      ? summaries
      : summaries.filter(r => !r.inProgress);
    return {
      rooms: filtered,
      totalCount: filtered.length,
      onlineCount: this.playerService.getOnlineCount(),
    };
  }

  createRoom(args: Record<string, unknown>) {
    const roomName = String(args.roomName || 'MCP Game');
    const botId = this.nextBotId();

    // Create virtual player for the bot
    const botPlayer = this.playerService.createPlayer(
      botId,
      'Claude (MCP)',
    );

    // Create room + auto-join the bot
    const room = this.roomService.createRoom(roomName, botPlayer);
    const joinResult = this.roomService.joinRoom(room.id, botPlayer);

    return {
      success: true,
      roomId: room.id,
      roomName: room.name,
      botSocketId: botId,
      yourColor: joinResult.color,
      message: `Room "${room.name}" created. You joined as ${joinResult.color}. Waiting for an opponent…`,
    };
  }

  joinRoom(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const botId = this.nextBotId();

    const botPlayer = this.playerService.createPlayer(botId, 'Claude (MCP)');
    const result = this.roomService.joinRoom(roomId, botPlayer);

    if (!result.success) {
      throw new Error(result.error || 'Failed to join room');
    }

    const room = result.room!;

    // Notify WebSocket clients
    gameEvents.emit(PLAYER_JOINED, {
      roomId: room.id,
      player: botPlayer,
      isSpectator: result.isSpectator,
    });

    // If game just started (2 players), broadcast
    if (room.players.length === 2 && room.gameState) {
      gameEvents.emit(GAME_STARTED, {
        roomId: room.id,
        gameState: room.gameState,
        players: room.players,
      });
    }

    const payload: Record<string, unknown> = {
      success: true,
      roomId: room.id,
      botSocketId: botId,
      yourColor: result.color ?? null,
      isSpectator: result.isSpectator,
      room: this.roomSummary(room),
    };

    if (room.gameState) {
      payload.gameState = this.gamePayload(room.gameState);
      payload.message = `Joined room "${room.name}". Game is in progress. It is ${room.gameState.currentTurn}'s turn.`;
    } else {
      payload.message = `Joined room "${room.name}" as ${result.isSpectator ? 'spectator' : result.color}. Waiting for more players.`;
    }

    return payload;
  }

  leaveRoom(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    // Find the MCP bot in the room
    const botPlayer = room.players.find(p => p.id.startsWith(this.BOT_SOCKET_PREFIX));
    if (!botPlayer) throw new Error('Bot is not in this room');

    this.roomService.leaveRoom(botPlayer.id);
    this.playerService.removePlayer(botPlayer.id);

    // Notify WebSocket clients
    gameEvents.emit(PLAYER_LEFT, {
      roomId: room.id,
      player: botPlayer,
      isSpectator: false,
    });

    return { success: true, message: `Left room "${room.name}".` };
  }

  getGameState(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');

    const result: Record<string, unknown> = {
      room: this.roomSummary(room),
    };

    if (room.gameState) {
      result.gameState = this.gamePayload(room.gameState);
    } else {
      result.message = 'Game has not started yet (need 2 players).';
    }

    return result;
  }

  getValidMoves(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.gameState) throw new Error('Game has not started');

    return {
      currentTurn: room.gameState.currentTurn,
      validMoves: room.gameState.validMoves,
      count: room.gameState.validMoves.length,
      hint:
        room.gameState.validMoves.length === 0
          ? 'No valid moves – you must pass.'
          : undefined,
    };
  }

  doMakeMove(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const row = Number(args.row);
    const col = Number(args.col);

    if (row < 0 || row > 7 || col < 0 || col > 7) {
      throw new Error('row and col must be 0-7');
    }

    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.gameState) throw new Error('Game has not started');

    // Determine the bot's color
    const botPlayer = room.players.find(p =>
      p.id.startsWith(this.BOT_SOCKET_PREFIX),
    );
    const botColor = botPlayer?.color;
    if (!botColor) throw new Error('Bot is not a player in this room');
    if (room.gameState.currentTurn !== botColor) {
      throw new Error(
        `It is not your turn. Current turn: ${room.gameState.currentTurn}`,
      );
    }

    // Execute through the shared game engine
    const moveResult = this.gameService.makeMove(
      room.gameState,
      row,
      col,
      botColor,
    );

    if (!moveResult.success) {
      throw new Error(moveResult.error || 'Invalid move');
    }

    // Persist new state
    this.roomService.updateGameState(roomId, moveResult.newState);

    // Broadcast to WebSocket clients so browser players see the move
    gameEvents.emit(GAME_STATE_UPDATED, {
      roomId,
      gameState: moveResult.newState,
      message: moveResult.newState.gameOver
        ? `Game Over! ${moveResult.newState.winner === 'draw' ? "It's a draw!" : `${moveResult.newState.winner} wins!`}`
        : undefined,
    });

    if (moveResult.newState.gameOver) {
      gameEvents.emit(GAME_OVER, {
        roomId,
        winner: moveResult.newState.winner,
        blackScore: moveResult.newState.blackScore,
        whiteScore: moveResult.newState.whiteScore,
      });
    }

    const resp: Record<string, unknown> = {
      success: true,
      move: { row, col },
      gameState: this.gamePayload(moveResult.newState),
    };

    if (moveResult.newState.gameOver) {
      resp.gameOver = true;
      resp.winner = moveResult.newState.winner;
      resp.finalScore = {
        black: moveResult.newState.blackScore,
        white: moveResult.newState.whiteScore,
      };
    }

    return resp;
  }

  doPassTurn(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.gameState) throw new Error('Game has not started');

    const botPlayer = room.players.find(p =>
      p.id.startsWith(this.BOT_SOCKET_PREFIX),
    );
    const botColor = botPlayer?.color;
    if (!botColor) throw new Error('Bot is not a player in this room');

    const passResult = this.gameService.passTurn(room.gameState, botColor);
    if (!passResult.success) {
      throw new Error(passResult.error || 'Cannot pass');
    }

    this.roomService.updateGameState(roomId, passResult.newState);

    // Broadcast pass to WebSocket clients
    gameEvents.emit(TURN_PASSED, {
      roomId,
      gameState: passResult.newState,
      player: botColor,
    });

    return {
      success: true,
      message: `${botColor} passed.`,
      gameState: this.gamePayload(passResult.newState),
    };
  }

  doGetHint(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.gameState) throw new Error('Game has not started');

    const botPlayer = room.players.find(p =>
      p.id.startsWith(this.BOT_SOCKET_PREFIX),
    );
    const botColor = botPlayer?.color ?? room.gameState.currentTurn;

    const hint = this.gameService.getHint(room.gameState, botColor);

    return {
      currentTurn: room.gameState.currentTurn,
      suggestedMove: hint,
      message: hint
        ? `Engine suggests (${hint.row}, ${hint.col}).`
        : 'No hint available (no valid moves).',
    };
  }

  doResignGame(args: Record<string, unknown>) {
    const roomId = String(args.roomId);
    const room = this.roomService.getRoom(roomId);
    if (!room) throw new Error('Room not found');
    if (!room.gameState) throw new Error('Game has not started');

    const botPlayer = room.players.find(p =>
      p.id.startsWith(this.BOT_SOCKET_PREFIX),
    );
    const botColor = botPlayer?.color;
    if (!botColor) throw new Error('Bot is not a player in this room');

    const opponent = botColor === PlayerColor.Black ? PlayerColor.White : PlayerColor.Black;

    // Mark game over
    room.gameState.gameOver = true;
    room.gameState.winner = opponent;
    this.roomService.updateGameState(roomId, room.gameState);

    // Broadcast resignation to WebSocket clients
    gameEvents.emit(GAME_OVER, {
      roomId,
      winner: opponent,
      blackScore: room.gameState.blackScore,
      whiteScore: room.gameState.whiteScore,
    });

    return {
      success: true,
      resigned: botColor,
      winner: opponent,
      message: `${botColor} resigned. ${opponent} wins!`,
    };
  }
}
