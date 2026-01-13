/**
 * Game State Service
 * Manages the game state for Reversi
 * Replicates the internal state management of REVERSI.EXE
 */

import { Injectable, signal, computed } from '@angular/core';
import {
  CellState,
  Player,
  SkillLevel,
  GameState,
  Position,
  Score,
  BOARD_SIZE,
  INTERNAL_SIZE
} from '../models/game.types';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {
  
  // Internal 10x10 board matching original binary structure
  private _board = signal<CellState[][]>(this.createEmptyBoard());
  
  // Current player turn
  private _currentPlayer = signal<Player>(Player.Human);
  
  // Skill level (persists during session)
  private _skillLevel = signal<SkillLevel>(SkillLevel.Beginner);
  
  // Game over flag
  private _gameOver = signal<boolean>(false);
  
  // Current message to display
  private _message = signal<string | null>(null);
  
  // Winner of the game
  private _winner = signal<Player | null>(null);
  
  // Computed scores
  readonly score = computed<Score>(() => {
    const board = this._board();
    let black = 0;
    let white = 0;
    
    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (let col = 1; col <= BOARD_SIZE; col++) {
        if (board[row][col] === CellState.Black) {
          black++;
        } else if (board[row][col] === CellState.White) {
          white++;
        }
      }
    }
    
    return { black, white };
  });
  
  // Public read-only signals
  readonly board = this._board.asReadonly();
  readonly currentPlayer = this._currentPlayer.asReadonly();
  readonly skillLevel = this._skillLevel.asReadonly();
  readonly gameOver = this._gameOver.asReadonly();
  readonly message = this._message.asReadonly();
  readonly winner = this._winner.asReadonly();
  
  // Computed full game state
  readonly gameState = computed<GameState>(() => ({
    board: this._board(),
    currentPlayer: this._currentPlayer(),
    humanScore: this.score().black,
    computerScore: this.score().white,
    skillLevel: this._skillLevel(),
    gameOver: this._gameOver(),
    winner: this._winner(),
    message: this._message()
  }));
  
  constructor() {
    this.initializeGame();
  }
  
  /**
   * Create an empty 10x10 board with boundary markers
   * Matches original binary structure at segment offset 0x0654
   */
  private createEmptyBoard(): CellState[][] {
    const board: CellState[][] = [];
    
    for (let row = 0; row < INTERNAL_SIZE; row++) {
      board[row] = [];
      for (let col = 0; col < INTERNAL_SIZE; col++) {
        // Boundaries at row/col 0 and 9
        if (row === 0 || row === 9 || col === 0 || col === 9) {
          board[row][col] = CellState.Boundary;
        } else {
          board[row][col] = CellState.Empty;
        }
      }
    }
    
    return board;
  }
  
  /**
   * Initialize game with standard starting position
   * Center 4 pieces as per original:
   * (4,4)=White, (4,5)=Black, (5,4)=Black, (5,5)=White
   */
  initializeGame(): void {
    const board = this.createEmptyBoard();
    
    // Standard starting position (center)
    // Using 1-based indexing (1-8 are playable)
    // Position 4,5 means row 4, col 5 in display (but internal row 4, col 5)
    board[4][4] = CellState.White;
    board[4][5] = CellState.Black;
    board[5][4] = CellState.Black;
    board[5][5] = CellState.White;
    
    this._board.set(board);
    this._currentPlayer.set(Player.Human);
    this._gameOver.set(false);
    this._winner.set(null);
    this._message.set(null);
  }
  
  /**
   * Get cell state at position (1-8 based)
   */
  getCellState(row: number, col: number): CellState {
    if (row < 1 || row > 8 || col < 1 || col > 8) {
      return CellState.Boundary;
    }
    return this._board()[row][col];
  }
  
  /**
   * Set cell state at position
   */
  setCellState(row: number, col: number, state: CellState): void {
    if (row < 1 || row > 8 || col < 1 || col > 8) {
      return;
    }
    
    const board = this._board().map(r => [...r]);
    board[row][col] = state;
    this._board.set(board);
  }
  
  /**
   * Apply multiple cell changes at once (for flipping pieces)
   */
  applyMoves(positions: Position[], state: CellState): void {
    const board = this._board().map(r => [...r]);
    
    for (const pos of positions) {
      if (pos.row >= 1 && pos.row <= 8 && pos.col >= 1 && pos.col <= 8) {
        board[pos.row][pos.col] = state;
      }
    }
    
    this._board.set(board);
  }
  
  /**
   * Switch to next player
   */
  switchPlayer(): void {
    this._currentPlayer.set(
      this._currentPlayer() === Player.Human ? Player.Computer : Player.Human
    );
  }
  
  /**
   * Set skill level
   */
  setSkillLevel(level: SkillLevel): void {
    this._skillLevel.set(level);
  }
  
  /**
   * Set message to display
   */
  setMessage(message: string | null): void {
    this._message.set(message);
  }
  
  /**
   * End the game
   */
  endGame(winner: Player | null): void {
    this._gameOver.set(true);
    this._winner.set(winner);
  }
  
  /**
   * Get a copy of the current board for AI calculations
   */
  getBoardCopy(): CellState[][] {
    return this._board().map(row => [...row]);
  }
}
