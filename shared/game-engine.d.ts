import { CellState, PlayerColor, Position, GameState } from './game.types';
export declare function createInitialBoard(): CellState[][];
export declare function createInitialGameState(): GameState;
export declare function colorToCellState(color: PlayerColor): CellState;
export declare function cellStateToColor(state: CellState): PlayerColor | null;
export declare function getOpponentColor(color: PlayerColor): PlayerColor;
export declare function isValidPosition(row: number, col: number): boolean;
export declare function getFlippedPieces(board: CellState[][], row: number, col: number, playerColor: PlayerColor): Position[];
export declare function isValidMove(board: CellState[][], row: number, col: number, playerColor: PlayerColor): boolean;
export declare function getValidMoves(board: CellState[][], playerColor: PlayerColor): Position[];
export declare function applyMove(board: CellState[][], row: number, col: number, playerColor: PlayerColor): {
    newBoard: CellState[][];
    flipped: Position[];
};
export declare function calculateScores(board: CellState[][]): {
    blackScore: number;
    whiteScore: number;
};
export declare function isGameOver(board: CellState[][]): boolean;
export declare function determineWinner(board: CellState[][]): PlayerColor | 'draw' | null;
export declare function processMove(gameState: GameState, row: number, col: number, playerColor: PlayerColor): {
    success: boolean;
    newState: GameState;
    error?: string;
};
export declare function processPass(gameState: GameState, playerColor: PlayerColor): {
    success: boolean;
    newState: GameState;
    error?: string;
};
export declare function getHint(gameState: GameState, playerColor: PlayerColor): Position | null;
export declare function cloneGameState(state: GameState): GameState;
