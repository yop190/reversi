/**
 * Computer Player Service
 * AI opponent for Reversi matching original REVERSI.EXE behavior
 * Implements skill level-based move selection
 */

import { Injectable } from '@angular/core';
import {
  CellState,
  Player,
  SkillLevel,
  Position,
  Move,
  BOARD_SIZE,
  playerToCellState
} from '../models/game.types';
import { MoveValidationService } from './move-validation.service';

@Injectable({
  providedIn: 'root'
})
export class ComputerPlayerService {

  // Position weights for strategic evaluation
  // Corners are most valuable, edges less so, adjacent to corners are dangerous
  private readonly POSITION_WEIGHTS: number[][] = [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 100, -20, 10, 5, 5, 10, -20, 100, 0],
    [0, -20, -50, -2, -2, -2, -2, -50, -20, 0],
    [0, 10, -2, 1, 1, 1, 1, -2, 10, 0],
    [0, 5, -2, 1, 0, 0, 1, -2, 5, 0],
    [0, 5, -2, 1, 0, 0, 1, -2, 5, 0],
    [0, 10, -2, 1, 1, 1, 1, -2, 10, 0],
    [0, -20, -50, -2, -2, -2, -2, -50, -20, 0],
    [0, 100, -20, 10, 5, 5, 10, -20, 100, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  ];

  constructor(private moveValidation: MoveValidationService) { }

  /**
   * Get the computer's move based on skill level
   */
  getMove(board: CellState[][], skillLevel: SkillLevel): Move | null {
    const validMoves = this.moveValidation.getValidMoves(board, Player.Computer);

    if (validMoves.length === 0) {
      return null;
    }

    switch (skillLevel) {
      case SkillLevel.Beginner:
        return this.getBeginnerMove(validMoves);
      case SkillLevel.Novice:
        return this.getNoviceMove(validMoves, board);
      case SkillLevel.Expert:
        return this.getExpertMove(validMoves, board);
      case SkillLevel.Master:
        return this.getMasterMove(validMoves, board);
      default:
        return this.getBeginnerMove(validMoves);
    }
  }

  /**
   * Beginner: Random move selection
   */
  private getBeginnerMove(moves: Move[]): Move {
    const index = Math.floor(Math.random() * moves.length);
    return moves[index];
  }

  /**
   * Novice: Prefer moves that flip more pieces, with some randomness
   */
  private getNoviceMove(moves: Move[], board: CellState[][]): Move {
    // Sort by number of flips
    const sorted = [...moves].sort((a, b) => b.flips.length - a.flips.length);

    // Take top 3 moves and pick randomly
    const topMoves = sorted.slice(0, Math.min(3, sorted.length));
    const index = Math.floor(Math.random() * topMoves.length);
    return topMoves[index];
  }

  /**
   * Expert: Use position weights + flip count
   */
  private getExpertMove(moves: Move[], board: CellState[][]): Move {
    let bestMove = moves[0];
    let bestScore = Number.MIN_SAFE_INTEGER;

    for (const move of moves) {
      const posWeight = this.POSITION_WEIGHTS[move.position.row][move.position.col];
      const flipScore = move.flips.length * 2;
      const score = posWeight + flipScore;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Master: Minimax with position evaluation
   */
  private getMasterMove(moves: Move[], board: CellState[][]): Move {
    let bestMove = moves[0];
    let bestScore = Number.MIN_SAFE_INTEGER;

    for (const move of moves) {
      // Apply move to get new board state
      const newBoard = this.applyMove(board, move, Player.Computer);

      // Evaluate using minimax (depth 3)
      const score = this.minimax(newBoard, 3, false, Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  /**
   * Minimax with alpha-beta pruning
   */
  private minimax(
    board: CellState[][],
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    const currentPlayer = isMaximizing ? Player.Computer : Player.Human;
    const validMoves = this.moveValidation.getValidMoves(board, currentPlayer);

    // Terminal conditions
    if (depth === 0 || validMoves.length === 0) {
      return this.evaluateBoard(board);
    }

    if (isMaximizing) {
      let maxEval = Number.MIN_SAFE_INTEGER;
      for (const move of validMoves) {
        const newBoard = this.applyMove(board, move, currentPlayer);
        const evalScore = this.minimax(newBoard, depth - 1, false, alpha, beta);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Number.MAX_SAFE_INTEGER;
      for (const move of validMoves) {
        const newBoard = this.applyMove(board, move, currentPlayer);
        const evalScore = this.minimax(newBoard, depth - 1, true, alpha, beta);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Apply a move to a board and return new board state
   */
  private applyMove(board: CellState[][], move: Move, player: Player): CellState[][] {
    const newBoard = board.map(row => [...row]);
    const cellState = playerToCellState(player);

    // Place the piece
    newBoard[move.position.row][move.position.col] = cellState;

    // Flip captured pieces
    for (const flip of move.flips) {
      newBoard[flip.row][flip.col] = cellState;
    }

    return newBoard;
  }

  /**
   * Evaluate board position for the computer
   */
  private evaluateBoard(board: CellState[][]): number {
    let score = 0;

    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (let col = 1; col <= BOARD_SIZE; col++) {
        const weight = this.POSITION_WEIGHTS[row][col];
        if (board[row][col] === CellState.White) {
          score += weight;
        } else if (board[row][col] === CellState.Black) {
          score -= weight;
        }
      }
    }

    // Also consider piece count
    const counts = this.moveValidation.countPieces(board);
    score += (counts.white - counts.black) * 0.5;

    return score;
  }
}
