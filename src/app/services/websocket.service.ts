/**
 * WebSocket Service for Multiplayer Reversi
 * Handles all real-time communication with the game server
 */

import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import {
  ClientEvents,
  ServerEvents,
  LobbyState,
  RoomInfo,
  GameState,
  PlayerColor,
  RoomSummary,
  Position,
  ErrorPayload,
  RoomJoinedPayload,
  GameStateUpdatePayload,
  HintResponsePayload,
  PlayerInfo,
} from '@shared/game.types';

export interface ConnectionState {
  connected: boolean;
  playerId: string | null;
  username: string;
}

export interface RoomState {
  room: RoomInfo | null;
  yourColor: PlayerColor | null;
  isSpectator: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: Socket | null = null;
  private ngZone = inject(NgZone);
  
  // Server URL - from environment configuration
  private readonly serverUrl = environment.wsUrl;
  
  // Connection state
  private _connectionState = signal<ConnectionState>({
    connected: false,
    playerId: null,
    username: '',
  });
  
  // Lobby state
  private _lobbyState = signal<LobbyState>({
    rooms: [],
    onlineCount: 0,
  });
  
  // Current room state
  private _roomState = signal<RoomState>({
    room: null,
    yourColor: null,
    isSpectator: false,
  });
  
  // Current game state
  private _gameState = signal<GameState | null>(null);
  
  // Hint position
  private _hint = signal<Position | null>(null);
  
  // Error messages
  private _lastError = signal<string | null>(null);
  
  // Computed states
  readonly connectionState = this._connectionState.asReadonly();
  readonly lobbyState = this._lobbyState.asReadonly();
  readonly roomState = this._roomState.asReadonly();
  readonly gameState = this._gameState.asReadonly();
  readonly hint = this._hint.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  
  readonly isConnected = computed(() => this._connectionState().connected);
  readonly isInRoom = computed(() => this._roomState().room !== null);
  readonly isPlayer = computed(() => !this._roomState().isSpectator && this._roomState().yourColor !== null);
  readonly isSpectator = computed(() => this._roomState().isSpectator);
  readonly isMyTurn = computed(() => {
    const state = this._gameState();
    const roomState = this._roomState();
    return state && roomState.yourColor === state.currentTurn;
  });
  readonly gameInProgress = computed(() => {
    const state = this._gameState();
    return state !== null && !state.gameOver;
  });
  readonly waitingForOpponent = computed(() => {
    const roomState = this._roomState();
    return roomState.room !== null && 
           roomState.room.players.length < 2 && 
           !roomState.isSpectator;
  });
  
  /**
   * Connect to the game server
   */
  connect(): void {
    if (this.socket?.connected) {
      return;
    }
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    
    this.setupEventListeners();
  }
  
  /**
   * Disconnect from the server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this._connectionState.set({
      connected: false,
      playerId: null,
      username: '',
    });
    this._roomState.set({
      room: null,
      yourColor: null,
      isSpectator: false,
    });
    this._gameState.set(null);
  }
  
  /**
   * Set username
   */
  setUsername(username: string): void {
    this.emit(ClientEvents.SetUsername, { username });
  }
  
  /**
   * Get lobby state
   */
  getLobby(): void {
    this.emit(ClientEvents.GetLobby, {});
  }
  
  /**
   * Create a new room
   */
  createRoom(roomName: string): void {
    this.emit(ClientEvents.CreateRoom, { roomName });
  }
  
  /**
   * Join an existing room
   */
  joinRoom(roomId: string): void {
    this.emit(ClientEvents.JoinRoom, { roomId });
  }
  
  /**
   * Leave current room
   */
  leaveRoom(): void {
    this.emit(ClientEvents.LeaveRoom, {});
    this._roomState.set({
      room: null,
      yourColor: null,
      isSpectator: false,
    });
    this._gameState.set(null);
    this._hint.set(null);
  }
  
  /**
   * Make a move
   */
  makeMove(row: number, col: number): void {
    this.emit(ClientEvents.MakeMove, { row, col });
  }
  
  /**
   * Pass turn
   */
  passTurn(): void {
    this.emit(ClientEvents.PassTurn, {});
  }
  
  /**
   * Request a hint
   */
  requestHint(): void {
    this.emit(ClientEvents.RequestHint, {});
  }
  
  /**
   * Restart the game
   */
  restartGame(): void {
    this.emit(ClientEvents.RestartGame, {});
  }
  
  /**
   * Clear hint
   */
  clearHint(): void {
    this._hint.set(null);
  }
  
  /**
   * Clear error
   */
  clearError(): void {
    this._lastError.set(null);
  }
  
  /**
   * Setup all socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', () => {
      this.ngZone.run(() => {
        console.log('Connected to server');
      });
    });
    
    this.socket.on('disconnect', () => {
      this.ngZone.run(() => {
        console.log('Disconnected from server');
        this._connectionState.update(state => ({
          ...state,
          connected: false,
        }));
      });
    });
    
    // Server events
    this.socket.on(ServerEvents.Connected, (data: { playerId: string; username: string }) => {
      this.ngZone.run(() => {
        this._connectionState.set({
          connected: true,
          playerId: data.playerId,
          username: data.username,
        });
        // Request lobby state
        this.getLobby();
      });
    });
    
    this.socket.on(ServerEvents.Error, (error: ErrorPayload) => {
      this.ngZone.run(() => {
        console.error('Server error:', error);
        this._lastError.set(error.message);
      });
    });
    
    this.socket.on(ServerEvents.LobbyUpdate, (lobby: LobbyState) => {
      this.ngZone.run(() => {
        this._lobbyState.set(lobby);
      });
    });
    
    this.socket.on(ServerEvents.RoomJoined, (payload: RoomJoinedPayload) => {
      this.ngZone.run(() => {
        this._roomState.set({
          room: payload.room,
          yourColor: payload.yourColor,
          isSpectator: payload.isSpectator,
        });
        if (payload.room.gameState) {
          this._gameState.set(payload.room.gameState);
        }
      });
    });
    
    this.socket.on(ServerEvents.RoomLeft, () => {
      this.ngZone.run(() => {
        this._roomState.set({
          room: null,
          yourColor: null,
          isSpectator: false,
        });
        this._gameState.set(null);
      });
    });
    
    this.socket.on(ServerEvents.GameStarted, (data: { gameState: GameState; players: PlayerInfo[] }) => {
      this.ngZone.run(() => {
        this._gameState.set(data.gameState);
        this._roomState.update(state => ({
          ...state,
          room: state.room ? {
            ...state.room,
            players: data.players,
            gameState: data.gameState,
          } : null,
        }));
      });
    });
    
    this.socket.on(ServerEvents.GameStateUpdate, (payload: GameStateUpdatePayload) => {
      this.ngZone.run(() => {
        if (payload.gameState) {
          this._gameState.set(payload.gameState);
        }
        this._hint.set(null); // Clear hint on state update
      });
    });
    
    this.socket.on(ServerEvents.PlayerJoined, (data: { player: PlayerInfo; isSpectator: boolean }) => {
      this.ngZone.run(() => {
        this._roomState.update(state => {
          if (!state.room) return state;
          
          const updatedRoom = { ...state.room };
          if (data.isSpectator) {
            updatedRoom.spectators = [...updatedRoom.spectators, data.player];
          } else {
            updatedRoom.players = [...updatedRoom.players, data.player];
          }
          
          return { ...state, room: updatedRoom };
        });
      });
    });
    
    this.socket.on(ServerEvents.PlayerLeft, (data: { playerId: string; message: string }) => {
      this.ngZone.run(() => {
        this._roomState.update(state => {
          if (!state.room) return state;
          
          const updatedRoom = { ...state.room };
          updatedRoom.players = updatedRoom.players.filter((p: PlayerInfo) => p.id !== data.playerId);
          updatedRoom.spectators = updatedRoom.spectators.filter((p: PlayerInfo) => p.id !== data.playerId);
          
          // Reset game if a player left
          if (updatedRoom.players.length < 2) {
            updatedRoom.gameState = null;
            this._gameState.set(null);
          }
          
          return { ...state, room: updatedRoom };
        });
      });
    });
    
    this.socket.on(ServerEvents.GameOver, (data: { winner: PlayerColor | 'draw'; blackScore: number; whiteScore: number }) => {
      this.ngZone.run(() => {
        // Game over is handled via gameState update
        console.log('Game over:', data);
      });
    });
    
    this.socket.on(ServerEvents.HintResponse, (payload: HintResponsePayload) => {
      this.ngZone.run(() => {
        this._hint.set(payload.position);
      });
    });
    
    this.socket.on(ServerEvents.TurnPassed, (data: { player: PlayerColor; gameState: GameState }) => {
      this.ngZone.run(() => {
        this._gameState.set(data.gameState);
      });
    });
  }
  
  /**
   * Emit an event to the server
   */
  private emit(event: string, data: unknown): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('Cannot emit event - not connected');
    }
  }
}
