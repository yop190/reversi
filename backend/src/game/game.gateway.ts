import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import {
  ClientEvents,
  ServerEvents,
  SetUsernamePayload,
  CreateRoomPayload,
  JoinRoomPayload,
  MakeMovePayload,
  LobbyState,
  RoomJoinedPayload,
  GameStateUpdatePayload,
  HintResponsePayload,
  ErrorPayload,
} from '../../../shared/game.types';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { ScoreService } from '../score/score.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    googleId: string;
    email: string;
    displayName: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allowed?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const allowedPatterns = [
        /^http:\/\/localhost(:\d+)?$/, // localhost with any port
        /^https:\/\/reversi\.lebrere\.fr$/, // custom domain
        /^https:\/\/.*\.azurecontainerapps\.io$/, // any Azure Container Apps
      ];

      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      callback(null, isAllowed);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(GameGateway.name);
  private readonly authEnabled: boolean;

  constructor(
    private roomService: RoomService,
    private gameService: GameService,
    private playerService: PlayerService,
    private jwtService: JwtService,
    private scoreService: ScoreService,
    private configService: ConfigService,
  ) {
    // Check if Google OAuth is configured
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.authEnabled = !!googleClientId && googleClientId !== 'not-configured' && googleClientId !== 'CONFIGURE_ME';
    
    if (!this.authEnabled) {
      this.logger.warn('⚠️ Authentication is DISABLED - Google OAuth not configured');
    } else {
      this.logger.log('✅ Authentication is ENABLED');
    }
  }

  /**
   * Validate JWT token from socket handshake
   */
  private validateToken(client: Socket): { id: string; googleId: string; email: string; displayName: string } | null {
    try {
      // Extract token from various sources
      const token = 
        client.handshake.auth?.token ||
        client.handshake.query?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return null;
      }

      const payload = this.jwtService.verify(token as string);
      return {
        id: payload.sub,
        googleId: payload.googleId,
        email: payload.email,
        displayName: payload.displayName,
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error}`);
      return null;
    }
  }

  /**
   * Handle new connection
   */
  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client attempting connection: ${client.id}`);

    // Validate authentication (if enabled)
    const user = this.validateToken(client);
    
    if (this.authEnabled && !user) {
      this.logger.warn(`Unauthenticated connection rejected: ${client.id}`);
      client.emit(ServerEvents.Error, {
        message: 'Authentication required. Please sign in with Google.',
        code: 'AUTH_REQUIRED',
      });
      client.disconnect(true);
      return;
    }

    // If auth is disabled, create anonymous user
    if (!user && !this.authEnabled) {
      const anonymousId = `anon-${client.id.substring(0, 8)}`;
      client.user = {
        id: anonymousId,
        googleId: '',
        email: '',
        displayName: `Player-${anonymousId.substring(5, 10)}`,
      };
      this.logger.log(`Anonymous user connected (auth disabled): ${client.user.displayName}`);
    } else if (user) {
      // Attach authenticated user to socket
      client.user = user;
      this.logger.log(`Authenticated user connected: ${user.displayName} (${user.email})`);
    }

    // Create player with user info
    const player = this.playerService.createPlayer(
      client.id, 
      client.user?.displayName || 'Anonymous', 
      client.user?.id
    );

    client.emit(ServerEvents.Connected, {
      playerId: player.id,
      username: player.username,
      userId: client.user?.id || '',
      email: client.user?.email || '',
      authEnabled: this.authEnabled,
    });

    this.broadcastLobbyUpdate();
  }

  /**
   * Handle disconnection
   */
  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    const room = this.roomService.getPlayerRoom(client.id);
    const { wasPlayer } = this.roomService.leaveRoom(client.id);
    this.playerService.removePlayer(client.id);

    if (room && wasPlayer) {
      // Notify room that a player left
      this.server.to(room.id).emit(ServerEvents.PlayerLeft, {
        playerId: client.id,
        message: 'A player has left the game',
      });

      // Broadcast updated room state
      this.broadcastRoomState(room.id);
    }

    this.broadcastLobbyUpdate();
  }

  /**
   * Set username
   */
  @SubscribeMessage(ClientEvents.SetUsername)
  handleSetUsername(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SetUsernamePayload
  ) {
    const player = this.playerService.setUsername(client.id, payload.username);
    if (player) {
      client.emit(ServerEvents.Connected, {
        playerId: player.id,
        username: player.username,
      });

      // Update room if player is in one
      const room = this.roomService.getPlayerRoom(client.id);
      if (room) {
        this.broadcastRoomState(room.id);
      }
    }
  }

  /**
   * Get lobby state
   */
  @SubscribeMessage(ClientEvents.GetLobby)
  handleGetLobby(@ConnectedSocket() client: Socket) {
    const lobbyState = this.getLobbyState();
    client.emit(ServerEvents.LobbyUpdate, lobbyState);
  }

  /**
   * Create a new room
   */
  @SubscribeMessage(ClientEvents.CreateRoom)
  handleCreateRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: CreateRoomPayload
  ) {
    const player = this.playerService.getPlayer(client.id);
    if (!player) {
      this.sendError(client, 'Player not found', 'PLAYER_NOT_FOUND');
      return;
    }

    const room = this.roomService.createRoom(payload.roomName, player);
    const result = this.roomService.joinRoom(room.id, player);

    if (result.success && result.room) {
      client.join(room.id);

      const response: RoomJoinedPayload = {
        room: this.roomService.toRoomInfo(result.room),
        yourColor: result.color || null,
        isSpectator: result.isSpectator,
      };

      client.emit(ServerEvents.RoomJoined, response);
      this.broadcastLobbyUpdate();
    }
  }

  /**
   * Join an existing room
   */
  @SubscribeMessage(ClientEvents.JoinRoom)
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload
  ) {
    const player = this.playerService.getPlayer(client.id);
    if (!player) {
      this.sendError(client, 'Player not found', 'PLAYER_NOT_FOUND');
      return;
    }

    const result = this.roomService.joinRoom(payload.roomId, player);

    if (!result.success) {
      this.sendError(client, result.error || 'Failed to join room', 'JOIN_FAILED');
      return;
    }

    if (result.room) {
      client.join(result.room.id);

      const response: RoomJoinedPayload = {
        room: this.roomService.toRoomInfo(result.room),
        yourColor: result.color || null,
        isSpectator: result.isSpectator,
      };

      client.emit(ServerEvents.RoomJoined, response);

      // Notify others in room
      client.to(result.room.id).emit(ServerEvents.PlayerJoined, {
        player: player,
        isSpectator: result.isSpectator,
      });

      // If game just started (2 players), broadcast game state
      if (result.room.players.length === 2 && result.room.gameState) {
        this.server.to(result.room.id).emit(ServerEvents.GameStarted, {
          gameState: result.room.gameState,
          players: result.room.players,
        });
      }

      this.broadcastLobbyUpdate();
    }
  }

  /**
   * Leave current room
   */
  @SubscribeMessage(ClientEvents.LeaveRoom)
  handleLeaveRoom(@ConnectedSocket() client: Socket) {
    const room = this.roomService.getPlayerRoom(client.id);
    if (room) {
      client.leave(room.id);
      const { wasPlayer } = this.roomService.leaveRoom(client.id);

      client.emit(ServerEvents.RoomLeft, { success: true });

      if (wasPlayer) {
        this.server.to(room.id).emit(ServerEvents.PlayerLeft, {
          playerId: client.id,
          message: 'A player has left the game',
        });
        this.broadcastRoomState(room.id);
      }

      this.broadcastLobbyUpdate();
    }
  }

  /**
   * Make a move
   */
  @SubscribeMessage(ClientEvents.MakeMove)
  handleMakeMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: MakeMovePayload
  ) {
    const room = this.roomService.getPlayerRoom(client.id);
    if (!room) {
      this.sendError(client, 'Not in a room', 'NOT_IN_ROOM');
      return;
    }

    if (!room.gameState) {
      this.sendError(client, 'Game has not started', 'GAME_NOT_STARTED');
      return;
    }

    const playerColor = this.roomService.getPlayerColor(client.id, room.id);
    if (!playerColor) {
      this.sendError(client, 'You are a spectator', 'SPECTATOR_CANNOT_MOVE');
      return;
    }

    const result = this.gameService.makeMove(
      room.gameState,
      payload.row,
      payload.col,
      playerColor
    );

    if (!result.success) {
      this.sendError(client, result.error || 'Invalid move', 'INVALID_MOVE');
      return;
    }

    // Update room state
    this.roomService.updateGameState(room.id, result.newState);

    // Broadcast updated state
    const updatePayload: GameStateUpdatePayload = {
      gameState: result.newState,
      message: result.newState.gameOver
        ? `Game Over! ${result.newState.winner === 'draw' ? "It's a draw!" : `${result.newState.winner} wins!`}`
        : undefined,
    };

    this.server.to(room.id).emit(ServerEvents.GameStateUpdate, updatePayload);

    if (result.newState.gameOver) {
      // Record game result for scoring
      this.recordGameScore(room, result.newState);

      this.server.to(room.id).emit(ServerEvents.GameOver, {
        winner: result.newState.winner,
        blackScore: result.newState.blackScore,
        whiteScore: result.newState.whiteScore,
      });
    }
  }

  /**
   * Record game result for persistent scoring
   */
  private async recordGameScore(room: any, gameState: any) {
    try {
      // Get player user IDs from the room
      const blackPlayer = room.players.find((p: any) => p.color === 'black');
      const whitePlayer = room.players.find((p: any) => p.color === 'white');

      if (!blackPlayer?.userId || !whitePlayer?.userId) {
        this.logger.warn('Cannot record score: player IDs not found');
        return;
      }

      const winner = gameState.winner as 'black' | 'white' | 'draw';

      await this.scoreService.recordGameResult({
        winner,
        blackPlayerId: blackPlayer.userId,
        whitePlayerId: whitePlayer.userId,
        blackScore: gameState.blackScore,
        whiteScore: gameState.whiteScore,
      });

      this.logger.log(`Game score recorded: ${winner} wins`);
    } catch (error) {
      this.logger.error('Failed to record game score:', error);
    }
  }

  /**
   * Pass turn
   */
  @SubscribeMessage(ClientEvents.PassTurn)
  handlePassTurn(@ConnectedSocket() client: Socket) {
    const room = this.roomService.getPlayerRoom(client.id);
    if (!room || !room.gameState) {
      this.sendError(client, 'Game not in progress', 'GAME_NOT_STARTED');
      return;
    }

    const playerColor = this.roomService.getPlayerColor(client.id, room.id);
    if (!playerColor) {
      this.sendError(client, 'You are a spectator', 'SPECTATOR_CANNOT_PASS');
      return;
    }

    const result = this.gameService.passTurn(room.gameState, playerColor);

    if (!result.success) {
      this.sendError(client, result.error || 'Cannot pass', 'CANNOT_PASS');
      return;
    }

    this.roomService.updateGameState(room.id, result.newState);

    this.server.to(room.id).emit(ServerEvents.TurnPassed, {
      player: playerColor,
      gameState: result.newState,
    });
  }

  /**
   * Request hint
   */
  @SubscribeMessage(ClientEvents.RequestHint)
  handleRequestHint(@ConnectedSocket() client: Socket) {
    const room = this.roomService.getPlayerRoom(client.id);
    if (!room || !room.gameState) {
      this.sendError(client, 'Game not in progress', 'GAME_NOT_STARTED');
      return;
    }

    const playerColor = this.roomService.getPlayerColor(client.id, room.id);
    if (!playerColor) {
      this.sendError(client, 'You are a spectator', 'SPECTATOR_NO_HINT');
      return;
    }

    const hint = this.gameService.getHint(room.gameState, playerColor);

    const response: HintResponsePayload = { position: hint };
    client.emit(ServerEvents.HintResponse, response);
  }

  /**
   * Restart game
   */
  @SubscribeMessage(ClientEvents.RestartGame)
  handleRestartGame(@ConnectedSocket() client: Socket) {
    const room = this.roomService.getPlayerRoom(client.id);
    if (!room) {
      this.sendError(client, 'Not in a room', 'NOT_IN_ROOM');
      return;
    }

    const playerColor = this.roomService.getPlayerColor(client.id, room.id);
    if (!playerColor) {
      this.sendError(client, 'Only players can restart', 'SPECTATOR_CANNOT_RESTART');
      return;
    }

    const newState = this.roomService.restartGame(room.id);
    if (newState) {
      this.server.to(room.id).emit(ServerEvents.GameStarted, {
        gameState: newState,
        players: room.players,
      });
    }
  }

  /**
   * Broadcast lobby update to all clients
   */
  private broadcastLobbyUpdate() {
    const lobbyState = this.getLobbyState();
    this.server.emit(ServerEvents.LobbyUpdate, lobbyState);
  }

  /**
   * Broadcast room state to room members
   */
  private broadcastRoomState(roomId: string) {
    const room = this.roomService.getRoom(roomId);
    if (room) {
      const roomInfo = this.roomService.toRoomInfo(room);
      this.server.to(roomId).emit(ServerEvents.GameStateUpdate, {
        gameState: room.gameState,
        room: roomInfo,
      });
    }
  }

  /**
   * Get current lobby state
   */
  private getLobbyState(): LobbyState {
    return {
      rooms: this.roomService.getRoomSummaries(),
      onlineCount: this.playerService.getOnlineCount(),
    };
  }

  /**
   * Send error to client
   */
  private sendError(client: Socket, message: string, code: string) {
    const error: ErrorPayload = { message, code };
    client.emit(ServerEvents.Error, error);
  }
}
