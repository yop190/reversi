"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const game_engine_1 = require("../../../shared/game-engine");
let GameService = class GameService {
    createGame() {
        return (0, game_engine_1.createInitialGameState)();
    }
    makeMove(gameState, row, col, playerColor) {
        return (0, game_engine_1.processMove)(gameState, row, col, playerColor);
    }
    passTurn(gameState, playerColor) {
        return (0, game_engine_1.processPass)(gameState, playerColor);
    }
    getHint(gameState, playerColor) {
        return (0, game_engine_1.getHint)(gameState, playerColor);
    }
    hasValidMoves(gameState, playerColor) {
        return (0, game_engine_1.getValidMoves)(gameState.board, playerColor).length > 0;
    }
    cloneState(gameState) {
        return (0, game_engine_1.cloneGameState)(gameState);
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)()
], GameService);
//# sourceMappingURL=game.service.js.map