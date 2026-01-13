/**
 * Shared Game Types for Multiplayer Reversi
 * Used by both frontend and backend
 */

export const BOARD_SIZE = 8;

export enum CellState {
  Empty = 0,
  Black = 1,  // Human/Player 1
  White = 2   // Computer/Player 2
}

export enum PlayerColor {
  Black = 'black',
  White = 'white'
}

export interface Position {
  row: number;
  col: number;
}

export interface GameMove {
  position: Position;
  playerColor: PlayerColor;
}

export interface PlayerInfo {
  id: string;
  username: string;
  color?: PlayerColor;
  isSpectator: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  players: PlayerInfo[];
  spectators: PlayerInfo[];
  gameState: GameState | null;
  createdAt: number;
}

export interface GameState {
  board: CellState[][];
  currentTurn: PlayerColor;
  blackScore: number;
  whiteScore: number;
  gameOver: boolean;
  winner: PlayerColor | 'draw' | null;
  lastMove: Position | null;
  validMoves: Position[];
}

export interface LobbyState {
  rooms: RoomSummary[];
  onlineCount: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  playerCount: number;
  spectatorCount: number;
  inProgress: boolean;
}

// WebSocket Events
export enum ClientEvents {
  SetUsername = 'client:setUsername',
  CreateRoom = 'client:createRoom',
  JoinRoom = 'client:joinRoom',
  LeaveRoom = 'client:leaveRoom',
  MakeMove = 'client:makeMove',
  PassTurn = 'client:passTurn',
  RequestHint = 'client:requestHint',
  RestartGame = 'client:restartGame',
  GetLobby = 'client:getLobby'
}

export enum ServerEvents {
  Connected = 'server:connected',
  Error = 'server:error',
  LobbyUpdate = 'server:lobbyUpdate',
  RoomJoined = 'server:roomJoined',
  RoomLeft = 'server:roomLeft',
  GameStarted = 'server:gameStarted',
  GameStateUpdate = 'server:gameStateUpdate',
  PlayerJoined = 'server:playerJoined',
  PlayerLeft = 'server:playerLeft',
  GameOver = 'server:gameOver',
  HintResponse = 'server:hintResponse',
  TurnPassed = 'server:turnPassed'
}

// Payloads
export interface SetUsernamePayload {
  username: string;
}

export interface CreateRoomPayload {
  roomName: string;
}

export interface JoinRoomPayload {
  roomId: string;
}

export interface MakeMovePayload {
  row: number;
  col: number;
}

export interface ErrorPayload {
  message: string;
  code: string;
}

export interface RoomJoinedPayload {
  room: RoomInfo;
  yourColor: PlayerColor | null;
  isSpectator: boolean;
}

export interface GameStateUpdatePayload {
  gameState: GameState;
  message?: string;
}

export interface HintResponsePayload {
  position: Position | null;
}
