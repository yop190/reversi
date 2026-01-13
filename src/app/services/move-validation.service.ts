/**
 * Move Validation Service
 * Handles all move validation logic for Reversi
 * Replicates the validation logic from REVERSI.EXE
 */

import { Injectable } from '@angular/core';
import {
  CellState,
  Player,
  Position,
  Move,
  Direction,
  DIRECTIONS,
  BOARD_SIZE,
  playerToCellState
} from '../models/game.types';

@Injectable({
  providedIn: 'root'
})
export class MoveValidationService {

  /**
   * Check if a move is valid for the given player
   * Returns the positions that would be flipped if valid, empty array if invalid
   */
  validateMove(board: CellState[][], row: number, col: number, player: Player): Position[] {
    // Must be on the board
    if (row < 1 || row > BOARD_SIZE || col < 1 || col > BOARD_SIZE) {
      return [];
    }

    // Must be empty
    if (board[row][col] !== CellState.Empty) {
      return [];
    }

    const opponent = player === Player.Human ? Player.Computer : Player.Human;
    const allFlips: Position[] = [];

    // Check all 8 directions
    for (const dir of DIRECTIONS) {
      const flips = this.checkDirection(board, row, col, dir, player, opponent);
      allFlips.push(...flips);
    }

    return allFlips;
  }

  /**
   * Check one direction for flippable pieces
   */
  private checkDirection(
    board: CellState[][],
    row: number,
    col: number,
    dir: Direction,
    player: Player,
    opponent: Player
  ): Position[] {
    const flips: Position[] = [];
    let r = row + dir.row;
    let c = col + dir.col;

    const playerCell = playerToCellState(player);
    const opponentCell = playerToCellState(opponent);

    // Must have at least one opponent piece adjacent
    if (board[r]?.[c] !== opponentCell) {
      return [];
    }

    // Collect opponent pieces
    while (board[r]?.[c] === opponentCell) {
      flips.push({ row: r, col: c });
      r += dir.row;
      c += dir.col;
    }

    // Must end with player's piece to be valid
    if (board[r]?.[c] === playerCell) {
      return flips;
    }

    return [];
  }

  /**
   * Get all valid moves for a player
   */
  getValidMoves(board: CellState[][], player: Player): Move[] {
    const moves: Move[] = [];

    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (let col = 1; col <= BOARD_SIZE; col++) {
        const flips = this.validateMove(board, row, col, player);
        if (flips.length > 0) {
          moves.push({
            position: { row, col },
            flips
          });
        }
      }
    }

    return moves;
  }

  /**
   * Check if player has any valid moves
   */
  hasValidMoves(board: CellState[][], player: Player): boolean {
    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (let col = 1; col <= BOARD_SIZE; col++) {
        if (this.validateMove(board, row, col, player).length > 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a specific position is a valid move
   */
  isValidMove(board: CellState[][], row: number, col: number, player: Player): boolean {
    return this.validateMove(board, row, col, player).length > 0;
  }

  /**
   * Count pieces for each player
   */
  countPieces(board: CellState[][]): { black: number; white: number } {
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
  }

  /**
   * Check if the board is full
   */
  isBoardFull(board: CellState[][]): boolean {
    for (let row = 1; row <= BOARD_SIZE; row++) {
      for (let col = 1; col <= BOARD_SIZE; col++) {
        if (board[row][col] === CellState.Empty) {
          return false;
        }
      }
    }
    return true;
  }
}
