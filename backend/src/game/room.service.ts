import { Injectable } from '@nestjs/common';
import {
  RoomInfo,
  RoomSummary,
  PlayerInfo,
  PlayerColor,
  GameState,
} from '../../../shared/game.types';
import { GameService } from './game.service';

interface Room extends RoomInfo {
  playerSockets: Map<string, PlayerColor>;
}

@Injectable()
export class RoomService {
  private rooms: Map<string, Room> = new Map();
  private playerRooms: Map<string, string> = new Map(); // socketId -> roomId
  private roomIdCounter = 0;

  constructor(private gameService: GameService) {}

  /**
   * Generate a unique room ID
   */
  private generateRoomId(): string {
    this.roomIdCounter++;
    const timestamp = Date.now().toString(36);
    const counter = this.roomIdCounter.toString(36);
    const random = Math.random().toString(36).substring(2, 6);
    return `${timestamp}-${counter}-${random}`.substring(0, 12);
  }

  /**
   * Create a new room
   */
  createRoom(roomName: string, creator: PlayerInfo): Room {
    const roomId = this.generateRoomId();
    const room: Room = {
      id: roomId,
      name: roomName || `Room ${roomId}`,
      players: [],
      spectators: [],
      gameState: null,
      createdAt: Date.now(),
      playerSockets: new Map(),
    };
    this.rooms.set(roomId, room);
    return room;
  }

  /**
   * Get a room by ID
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Get all rooms
   */
  getAllRooms(): Room[] {
    return Array.from(this.rooms.values());
  }

  /**
   * Get room summaries for lobby
   */
  getRoomSummaries(): RoomSummary[] {
    return this.getAllRooms().map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      spectatorCount: room.spectators.length,
      inProgress: room.gameState !== null && !room.gameState.gameOver,
    }));
  }

  /**
   * Get the room a player is in
   */
  getPlayerRoom(socketId: string): Room | undefined {
    const roomId = this.playerRooms.get(socketId);
    return roomId ? this.rooms.get(roomId) : undefined;
  }

  /**
   * Join a room
   */
  joinRoom(
    roomId: string,
    player: PlayerInfo
  ): { success: boolean; room?: Room; color?: PlayerColor; isSpectator: boolean; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, isSpectator: true, error: 'Room not found' };
    }

    // Check if player is already in a room
    const currentRoom = this.getPlayerRoom(player.id);
    if (currentRoom) {
      this.leaveRoom(player.id);
    }

    // Determine if player joins as player or spectator
    if (room.players.length < 2) {
      // Join as player
      const color = room.players.length === 0 ? PlayerColor.Black : PlayerColor.White;
      player.color = color;
      player.isSpectator = false;
      room.players.push(player);
      room.playerSockets.set(player.id, color);
      this.playerRooms.set(player.id, roomId);

      // Start game when 2 players are connected
      if (room.players.length === 2 && !room.gameState) {
        room.gameState = this.gameService.createGame();
      }

      return { success: true, room, color, isSpectator: false };
    } else {
      // Join as spectator
      player.isSpectator = true;
      player.color = undefined;
      room.spectators.push(player);
      this.playerRooms.set(player.id, roomId);
      return { success: true, room, isSpectator: true };
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(socketId: string): { room?: Room; wasPlayer: boolean } {
    const roomId = this.playerRooms.get(socketId);
    if (!roomId) {
      return { wasPlayer: false };
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(socketId);
      return { wasPlayer: false };
    }

    this.playerRooms.delete(socketId);

    // Check if player or spectator
    const playerIndex = room.players.findIndex(p => p.id === socketId);
    if (playerIndex !== -1) {
      room.players.splice(playerIndex, 1);
      room.playerSockets.delete(socketId);
      
      // Reset game if a player leaves
      if (room.gameState) {
        room.gameState = null;
      }

      // Clean up empty rooms
      if (room.players.length === 0 && room.spectators.length === 0) {
        this.rooms.delete(roomId);
      }

      return { room, wasPlayer: true };
    }

    const spectatorIndex = room.spectators.findIndex(s => s.id === socketId);
    if (spectatorIndex !== -1) {
      room.spectators.splice(spectatorIndex, 1);
    }

    // Clean up empty rooms
    if (room.players.length === 0 && room.spectators.length === 0) {
      this.rooms.delete(roomId);
    }

    return { room, wasPlayer: false };
  }

  /**
   * Get player color in a room
   */
  getPlayerColor(socketId: string, roomId: string): PlayerColor | undefined {
    const room = this.rooms.get(roomId);
    return room?.playerSockets.get(socketId);
  }

  /**
   * Update game state in room
   */
  updateGameState(roomId: string, gameState: GameState): boolean {
    const room = this.rooms.get(roomId);
    if (room) {
      room.gameState = gameState;
      return true;
    }
    return false;
  }

  /**
   * Restart game in room
   */
  restartGame(roomId: string): GameState | null {
    const room = this.rooms.get(roomId);
    if (room && room.players.length === 2) {
      room.gameState = this.gameService.createGame();
      return room.gameState;
    }
    return null;
  }

  /**
   * Find an available room or create one
   */
  findOrCreateRoom(player: PlayerInfo): Room {
    // Find a room with less than 2 players
    for (const room of this.rooms.values()) {
      if (room.players.length < 2) {
        return room;
      }
    }
    // Create a new room
    return this.createRoom(`Game Room`, player);
  }

  /**
   * Convert Room to RoomInfo (without internal data)
   */
  toRoomInfo(room: Room): RoomInfo {
    return {
      id: room.id,
      name: room.name,
      players: room.players,
      spectators: room.spectators,
      gameState: room.gameState,
      createdAt: room.createdAt,
    };
  }
}
