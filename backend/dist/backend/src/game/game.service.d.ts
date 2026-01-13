import { GameState, Position, PlayerColor } from '../../../shared/game.types';
export declare class GameService {
    createGame(): GameState;
    makeMove(gameState: GameState, row: number, col: number, playerColor: PlayerColor): {
        success: boolean;
        newState: GameState;
        error?: string;
    };
    passTurn(gameState: GameState, playerColor: PlayerColor): {
        success: boolean;
        newState: GameState;
        error?: string;
    };
    getHint(gameState: GameState, playerColor: PlayerColor): Position | null;
    hasValidMoves(gameState: GameState, playerColor: PlayerColor): boolean;
    cloneState(gameState: GameState): GameState;
}
