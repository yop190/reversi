/**
 * Game Engine Service
 * Main game controller coordinating all game logic
 * Replicates the core game loop of REVERSI.EXE
 */

import { Injectable, inject } from '@angular/core';
import {
  CellState,
  Player,
  SkillLevel,
  Position,
  Move,
  GameResult
} from '../models/game.types';
import { GameStateService } from './game-state.service';
import { MoveValidationService } from './move-validation.service';
import { ComputerPlayerService } from './computer-player.service';
import { SoundService } from './sound.service';

@Injectable({
  providedIn: 'root'
})
export class GameEngineService {

  private gameState = inject(GameStateService);
  private moveValidation = inject(MoveValidationService);
  private computerPlayer = inject(ComputerPlayerService);
  private sound = inject(SoundService);

  // Flag to prevent multiple computer moves
  private isComputerThinking = false;

  /**
   * Start a new game
   */
  newGame(): void {
    this.isComputerThinking = false;
    this.gameState.initializeGame();
    this.gameState.setMessage(null);
  }

  /**
   * Attempt to make a move at the given position
   * Returns true if move was made, false otherwise
   */
  makeMove(row: number, col: number): boolean {
    // Don't allow moves if game is over or computer is thinking
    if (this.gameState.gameOver() || this.isComputerThinking) {
      return false;
    }

    // Only human can click on the board
    if (this.gameState.currentPlayer() !== Player.Human) {
      return false;
    }

    const board = this.gameState.getBoardCopy();
    const flips = this.moveValidation.validateMove(board, row, col, Player.Human);

    if (flips.length === 0) {
      // Invalid move - show error message matching original
      this.gameState.setMessage('You may only move to a space where the cursor is a cross.');
      this.sound.play('invalid');
      return false;
    }

    // Clear any previous message
    this.gameState.setMessage(null);

    // Play move sound
    this.sound.play('move');

    // Apply the move
    this.applyMove({ position: { row, col }, flips }, Player.Human);

    // Check for game end
    if (this.checkGameEnd()) {
      return true;
    }

    // Switch to computer's turn
    this.gameState.switchPlayer();

    // Let computer make its move after a brief delay (simulating "thinking")
    this.scheduleComputerMove();

    return true;
  }

  /**
   * Apply a move to the game state
   */
  private applyMove(move: Move, player: Player): void {
    const playerCell = player === Player.Human ? CellState.Black : CellState.White;

    // Place the piece
    this.gameState.setCellState(move.position.row, move.position.col, playerCell);

    // Flip captured pieces
    this.gameState.applyMoves(move.flips, playerCell);
  }

  /**
   * Schedule computer's move with a small delay
   */
  private scheduleComputerMove(): void {
    if (this.isComputerThinking) {
      return;
    }

    this.isComputerThinking = true;

    // Small delay to simulate thinking (matching original feel)
    setTimeout(() => {
      this.executeComputerMove();
    }, 300);
  }

  /**
   * Execute the computer's move
   */
  private executeComputerMove(): void {
    if (this.gameState.gameOver()) {
      this.isComputerThinking = false;
      return;
    }

    const board = this.gameState.getBoardCopy();
    const hasValidMove = this.moveValidation.hasValidMoves(board, Player.Computer);

    if (!hasValidMove) {
      // Computer must pass
      this.gameState.switchPlayer();
      this.isComputerThinking = false;

      // Check if human can move
      const newBoard = this.gameState.getBoardCopy();
      if (!this.moveValidation.hasValidMoves(newBoard, Player.Human)) {
        // Neither player can move - game over
        this.endGame();
      }
      return;
    }

    // Get computer's move
    const move = this.computerPlayer.getMove(board, this.gameState.skillLevel());

    if (move) {
      this.applyMove(move, Player.Computer);
    }

    // Check for game end
    if (this.checkGameEnd()) {
      this.isComputerThinking = false;
      return;
    }

    // Switch to human's turn
    this.gameState.switchPlayer();
    this.isComputerThinking = false;

    // Check if human has valid moves
    const updatedBoard = this.gameState.getBoardCopy();
    if (!this.moveValidation.hasValidMoves(updatedBoard, Player.Human)) {
      // Human must pass
      this.gameState.setMessage('You must Pass');

      // Check if computer can play
      if (this.moveValidation.hasValidMoves(updatedBoard, Player.Computer)) {
        this.gameState.switchPlayer();
        this.scheduleComputerMove();
      } else {
        // Neither can move - game over
        this.endGame();
      }
    }
  }

  /**
   * Player requests to pass
   */
  pass(): boolean {
    if (this.gameState.gameOver()) {
      return false;
    }

    if (this.gameState.currentPlayer() !== Player.Human) {
      return false;
    }

    const board = this.gameState.getBoardCopy();

    // Check if player has valid moves (can't pass if they do)
    if (this.moveValidation.hasValidMoves(board, Player.Human)) {
      this.gameState.setMessage('You may not pass.  Move where the cursor is a cross.');
      return false;
    }

    // Clear message and pass
    this.gameState.setMessage(null);
    this.gameState.switchPlayer();

    // Check if computer can move
    if (this.moveValidation.hasValidMoves(board, Player.Computer)) {
      this.scheduleComputerMove();
    } else {
      // Neither player can move - game over
      this.endGame();
    }

    return true;
  }

  /**
   * Show hint - highlight a valid move
   * Returns position of suggested move or null
   */
  getHint(): Position | null {
    if (this.gameState.gameOver() || this.isComputerThinking) {
      return null;
    }

    if (this.gameState.currentPlayer() !== Player.Human) {
      return null;
    }

    const board = this.gameState.getBoardCopy();
    const validMoves = this.moveValidation.getValidMoves(board, Player.Human);

    if (validMoves.length === 0) {
      return null;
    }

    // Return the best move based on simple heuristics
    // Prefer corners, then edges, then most flips
    let bestMove = validMoves[0];
    let bestScore = this.evaluateHintMove(bestMove);

    for (const move of validMoves) {
      const score = this.evaluateHintMove(move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove.position;
  }

  /**
   * Simple evaluation for hint
   */
  private evaluateHintMove(move: Move): number {
    const { row, col } = move.position;
    let score = move.flips.length;

    // Corners are very good
    if ((row === 1 || row === 8) && (col === 1 || col === 8)) {
      score += 100;
    }
    // Edges are good
    else if (row === 1 || row === 8 || col === 1 || col === 8) {
      score += 10;
    }
    // Adjacent to corners is bad
    else if (
      (row <= 2 || row >= 7) && (col <= 2 || col >= 7)
    ) {
      score -= 20;
    }

    return score;
  }

  /**
   * Check if game has ended
   */
  private checkGameEnd(): boolean {
    const board = this.gameState.getBoardCopy();

    // Check if board is full
    if (this.moveValidation.isBoardFull(board)) {
      this.endGame();
      return true;
    }

    // Check if neither player can move
    const humanCanMove = this.moveValidation.hasValidMoves(board, Player.Human);
    const computerCanMove = this.moveValidation.hasValidMoves(board, Player.Computer);

    if (!humanCanMove && !computerCanMove) {
      this.endGame();
      return true;
    }

    return false;
  }

  /**
   * End the game and determine winner
   */
  private endGame(): void {
    const score = this.gameState.score();
    const result = this.getGameResult();

    let message: string;

    if (result.winner === null) {
      message = 'Tie Game';
      this.sound.play('draw');
    } else if (result.winner === Player.Human) {
      message = `You Won by ${result.scoreDifference}`;
      this.sound.play('win');
    } else {
      message = `You Lost by ${result.scoreDifference}`;
      this.sound.play('lose');
    }

    this.gameState.setMessage(message);
    this.gameState.endGame(result.winner);
  }

  /**
   * Get the game result
   */
  getGameResult(): GameResult {
    const score = this.gameState.score();
    const diff = Math.abs(score.black - score.white);

    let winner: Player | null = null;
    if (score.black > score.white) {
      winner = Player.Human;
    } else if (score.white > score.black) {
      winner = Player.Computer;
    }

    return {
      winner,
      scoreDifference: diff,
      humanScore: score.black,
      computerScore: score.white
    };
  }

  /**
   * Set skill level
   */
  setSkillLevel(level: SkillLevel): void {
    this.gameState.setSkillLevel(level);
  }

  /**
   * Check if a position is a valid move for current player
   */
  isValidMove(row: number, col: number): boolean {
    if (this.gameState.gameOver() || this.isComputerThinking) {
      return false;
    }

    if (this.gameState.currentPlayer() !== Player.Human) {
      return false;
    }

    const board = this.gameState.getBoardCopy();
    return this.moveValidation.isValidMove(board, row, col, Player.Human);
  }
}
