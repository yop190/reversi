"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomService = void 0;
const common_1 = require("@nestjs/common");
const game_types_1 = require("../../../shared/game.types");
const game_service_1 = require("./game.service");
let RoomService = class RoomService {
    constructor(gameService) {
        this.gameService = gameService;
        this.rooms = new Map();
        this.playerRooms = new Map();
        this.roomIdCounter = 0;
    }
    generateRoomId() {
        this.roomIdCounter++;
        const timestamp = Date.now().toString(36);
        const counter = this.roomIdCounter.toString(36);
        const random = Math.random().toString(36).substring(2, 6);
        return `${timestamp}-${counter}-${random}`.substring(0, 12);
    }
    createRoom(roomName, creator) {
        const roomId = this.generateRoomId();
        const room = {
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
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    getRoomSummaries() {
        return this.getAllRooms().map(room => ({
            id: room.id,
            name: room.name,
            playerCount: room.players.length,
            spectatorCount: room.spectators.length,
            inProgress: room.gameState !== null && !room.gameState.gameOver,
        }));
    }
    getPlayerRoom(socketId) {
        const roomId = this.playerRooms.get(socketId);
        return roomId ? this.rooms.get(roomId) : undefined;
    }
    joinRoom(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, isSpectator: true, error: 'Room not found' };
        }
        const currentRoom = this.getPlayerRoom(player.id);
        if (currentRoom) {
            this.leaveRoom(player.id);
        }
        if (room.players.length < 2) {
            const color = room.players.length === 0 ? game_types_1.PlayerColor.Black : game_types_1.PlayerColor.White;
            player.color = color;
            player.isSpectator = false;
            room.players.push(player);
            room.playerSockets.set(player.id, color);
            this.playerRooms.set(player.id, roomId);
            if (room.players.length === 2 && !room.gameState) {
                room.gameState = this.gameService.createGame();
            }
            return { success: true, room, color, isSpectator: false };
        }
        else {
            player.isSpectator = true;
            player.color = undefined;
            room.spectators.push(player);
            this.playerRooms.set(player.id, roomId);
            return { success: true, room, isSpectator: true };
        }
    }
    leaveRoom(socketId) {
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
        const playerIndex = room.players.findIndex(p => p.id === socketId);
        if (playerIndex !== -1) {
            room.players.splice(playerIndex, 1);
            room.playerSockets.delete(socketId);
            if (room.gameState) {
                room.gameState = null;
            }
            if (room.players.length === 0 && room.spectators.length === 0) {
                this.rooms.delete(roomId);
            }
            return { room, wasPlayer: true };
        }
        const spectatorIndex = room.spectators.findIndex(s => s.id === socketId);
        if (spectatorIndex !== -1) {
            room.spectators.splice(spectatorIndex, 1);
        }
        if (room.players.length === 0 && room.spectators.length === 0) {
            this.rooms.delete(roomId);
        }
        return { room, wasPlayer: false };
    }
    getPlayerColor(socketId, roomId) {
        const room = this.rooms.get(roomId);
        return room?.playerSockets.get(socketId);
    }
    updateGameState(roomId, gameState) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.gameState = gameState;
            return true;
        }
        return false;
    }
    restartGame(roomId) {
        const room = this.rooms.get(roomId);
        if (room && room.players.length === 2) {
            room.gameState = this.gameService.createGame();
            return room.gameState;
        }
        return null;
    }
    findOrCreateRoom(player) {
        for (const room of this.rooms.values()) {
            if (room.players.length < 2) {
                return room;
            }
        }
        return this.createRoom(`Game Room`, player);
    }
    toRoomInfo(room) {
        return {
            id: room.id,
            name: room.name,
            players: room.players,
            spectators: room.spectators,
            gameState: room.gameState,
            createdAt: room.createdAt,
        };
    }
};
exports.RoomService = RoomService;
exports.RoomService = RoomService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_service_1.GameService])
], RoomService);
//# sourceMappingURL=room.service.js.map