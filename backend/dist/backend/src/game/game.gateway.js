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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const game_types_1 = require("../../../shared/game.types");
const room_service_1 = require("./room.service");
const game_service_1 = require("./game.service");
const player_service_1 = require("./player.service");
let GameGateway = class GameGateway {
    constructor(roomService, gameService, playerService) {
        this.roomService = roomService;
        this.gameService = gameService;
        this.playerService = playerService;
    }
    handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
        const player = this.playerService.createPlayer(client.id);
        client.emit(game_types_1.ServerEvents.Connected, {
            playerId: player.id,
            username: player.username,
        });
        this.broadcastLobbyUpdate();
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        const room = this.roomService.getPlayerRoom(client.id);
        const { wasPlayer } = this.roomService.leaveRoom(client.id);
        this.playerService.removePlayer(client.id);
        if (room && wasPlayer) {
            this.server.to(room.id).emit(game_types_1.ServerEvents.PlayerLeft, {
                playerId: client.id,
                message: 'A player has left the game',
            });
            this.broadcastRoomState(room.id);
        }
        this.broadcastLobbyUpdate();
    }
    handleSetUsername(client, payload) {
        const player = this.playerService.setUsername(client.id, payload.username);
        if (player) {
            client.emit(game_types_1.ServerEvents.Connected, {
                playerId: player.id,
                username: player.username,
            });
            const room = this.roomService.getPlayerRoom(client.id);
            if (room) {
                this.broadcastRoomState(room.id);
            }
        }
    }
    handleGetLobby(client) {
        const lobbyState = this.getLobbyState();
        client.emit(game_types_1.ServerEvents.LobbyUpdate, lobbyState);
    }
    handleCreateRoom(client, payload) {
        const player = this.playerService.getPlayer(client.id);
        if (!player) {
            this.sendError(client, 'Player not found', 'PLAYER_NOT_FOUND');
            return;
        }
        const room = this.roomService.createRoom(payload.roomName, player);
        const result = this.roomService.joinRoom(room.id, player);
        if (result.success && result.room) {
            client.join(room.id);
            const response = {
                room: this.roomService.toRoomInfo(result.room),
                yourColor: result.color || null,
                isSpectator: result.isSpectator,
            };
            client.emit(game_types_1.ServerEvents.RoomJoined, response);
            this.broadcastLobbyUpdate();
        }
    }
    handleJoinRoom(client, payload) {
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
            const response = {
                room: this.roomService.toRoomInfo(result.room),
                yourColor: result.color || null,
                isSpectator: result.isSpectator,
            };
            client.emit(game_types_1.ServerEvents.RoomJoined, response);
            client.to(result.room.id).emit(game_types_1.ServerEvents.PlayerJoined, {
                player: player,
                isSpectator: result.isSpectator,
            });
            if (result.room.players.length === 2 && result.room.gameState) {
                this.server.to(result.room.id).emit(game_types_1.ServerEvents.GameStarted, {
                    gameState: result.room.gameState,
                    players: result.room.players,
                });
            }
            this.broadcastLobbyUpdate();
        }
    }
    handleLeaveRoom(client) {
        const room = this.roomService.getPlayerRoom(client.id);
        if (room) {
            client.leave(room.id);
            const { wasPlayer } = this.roomService.leaveRoom(client.id);
            client.emit(game_types_1.ServerEvents.RoomLeft, { success: true });
            if (wasPlayer) {
                this.server.to(room.id).emit(game_types_1.ServerEvents.PlayerLeft, {
                    playerId: client.id,
                    message: 'A player has left the game',
                });
                this.broadcastRoomState(room.id);
            }
            this.broadcastLobbyUpdate();
        }
    }
    handleMakeMove(client, payload) {
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
        const result = this.gameService.makeMove(room.gameState, payload.row, payload.col, playerColor);
        if (!result.success) {
            this.sendError(client, result.error || 'Invalid move', 'INVALID_MOVE');
            return;
        }
        this.roomService.updateGameState(room.id, result.newState);
        const updatePayload = {
            gameState: result.newState,
            message: result.newState.gameOver
                ? `Game Over! ${result.newState.winner === 'draw' ? "It's a draw!" : `${result.newState.winner} wins!`}`
                : undefined,
        };
        this.server.to(room.id).emit(game_types_1.ServerEvents.GameStateUpdate, updatePayload);
        if (result.newState.gameOver) {
            this.server.to(room.id).emit(game_types_1.ServerEvents.GameOver, {
                winner: result.newState.winner,
                blackScore: result.newState.blackScore,
                whiteScore: result.newState.whiteScore,
            });
        }
    }
    handlePassTurn(client) {
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
        this.server.to(room.id).emit(game_types_1.ServerEvents.TurnPassed, {
            player: playerColor,
            gameState: result.newState,
        });
    }
    handleRequestHint(client) {
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
        const response = { position: hint };
        client.emit(game_types_1.ServerEvents.HintResponse, response);
    }
    handleRestartGame(client) {
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
            this.server.to(room.id).emit(game_types_1.ServerEvents.GameStarted, {
                gameState: newState,
                players: room.players,
            });
        }
    }
    broadcastLobbyUpdate() {
        const lobbyState = this.getLobbyState();
        this.server.emit(game_types_1.ServerEvents.LobbyUpdate, lobbyState);
    }
    broadcastRoomState(roomId) {
        const room = this.roomService.getRoom(roomId);
        if (room) {
            const roomInfo = this.roomService.toRoomInfo(room);
            this.server.to(roomId).emit(game_types_1.ServerEvents.GameStateUpdate, {
                gameState: room.gameState,
                room: roomInfo,
            });
        }
    }
    getLobbyState() {
        return {
            rooms: this.roomService.getRoomSummaries(),
            onlineCount: this.playerService.getOnlineCount(),
        };
    }
    sendError(client, message, code) {
        const error = { message, code };
        client.emit(game_types_1.ServerEvents.Error, error);
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.SetUsername),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleSetUsername", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.GetLobby),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleGetLobby", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.CreateRoom),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleCreateRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.JoinRoom),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.LeaveRoom),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.MakeMove),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleMakeMove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.PassTurn),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handlePassTurn", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.RequestHint),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleRequestHint", null);
__decorate([
    (0, websockets_1.SubscribeMessage)(game_types_1.ClientEvents.RestartGame),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GameGateway.prototype, "handleRestartGame", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost'],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [room_service_1.RoomService,
        game_service_1.GameService,
        player_service_1.PlayerService])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map