/**
 * Reversi Game Type Definitions
 * Matches the original Windows 2.0 REVERSI.EXE structure
 */

/** Cell state values matching original binary */
export enum CellState {
  Empty = 0x00,
  White = 0x02,
  Black = 0x03,
  Boundary = 0xFF
}

/** Player identifiers - use same values as CellState for direct comparison */
export enum Player {
  Human = 0x03,   // Human plays black (same as CellState.Black)
  Computer = 0x02  // Computer plays white (same as CellState.White)
}

/** Convert Player to CellState */
export function playerToCellState(player: Player): CellState {
  return player === Player.Human ? CellState.Black : CellState.White;
}

/** Convert CellState to Player */
export function cellStateToPlayer(state: CellState): Player | null {
  if (state === CellState.Black) return Player.Human;
  if (state === CellState.White) return Player.Computer;
  return null;
}

/** Skill levels matching original menu */
export enum SkillLevel {
  Beginner = 1,
  Novice = 2,
  Expert = 3,
  Master = 4
}

/** Direction vectors for move validation (8 directions) */
export interface Direction {
  row: number;
  col: number;
}

/** Board position (1-8 for display, internal uses 0-9 with boundaries) */
export interface Position {
  row: number;
  col: number;
}

/** A move with the pieces it would flip */
export interface Move {
  position: Position;
  flips: Position[];
}

/** Game state snapshot */
export interface GameState {
  board: CellState[][];        // 10x10 internal grid
  currentPlayer: Player;
  humanScore: number;
  computerScore: number;
  skillLevel: SkillLevel;
  gameOver: boolean;
  winner: Player | null;
  message: string | null;
}

/** Score update */
export interface Score {
  black: number;
  white: number;
}

/** Game end result */
export interface GameResult {
  winner: Player | null;       // null = tie
  scoreDifference: number;
  humanScore: number;
  computerScore: number;
}

/** All 8 directions for checking moves */
export const DIRECTIONS: Direction[] = [
  { row: -1, col: -1 },  // NW
  { row: -1, col: 0 },   // N
  { row: -1, col: 1 },   // NE
  { row: 0, col: -1 },   // W
  { row: 0, col: 1 },    // E
  { row: 1, col: -1 },   // SW
  { row: 1, col: 0 },    // S
  { row: 1, col: 1 }     // SE
];

/** Board dimensions */
export const BOARD_SIZE = 8;
export const INTERNAL_SIZE = 10;  // Includes boundaries
