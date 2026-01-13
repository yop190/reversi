"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerService = void 0;
const common_1 = require("@nestjs/common");
let PlayerService = class PlayerService {
    constructor() {
        this.players = new Map();
    }
    createPlayer(socketId) {
        const player = {
            id: socketId,
            username: `Guest_${socketId.substring(0, 6)}`,
            isSpectator: true,
        };
        this.players.set(socketId, player);
        return player;
    }
    getPlayer(socketId) {
        return this.players.get(socketId);
    }
    setUsername(socketId, username) {
        const player = this.players.get(socketId);
        if (player) {
            player.username = username.trim().substring(0, 20) || player.username;
            return player;
        }
        return undefined;
    }
    removePlayer(socketId) {
        const player = this.players.get(socketId);
        this.players.delete(socketId);
        return player;
    }
    getOnlineCount() {
        return this.players.size;
    }
    getAllPlayers() {
        return Array.from(this.players.values());
    }
};
exports.PlayerService = PlayerService;
exports.PlayerService = PlayerService = __decorate([
    (0, common_1.Injectable)()
], PlayerService);
//# sourceMappingURL=player.service.js.map