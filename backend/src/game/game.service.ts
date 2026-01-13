import { Injectable } from '@nestjs/common';
import {
  GameState,
  Position,
  PlayerColor,
} from '../../../shared/game.types';
import {
  createInitialGameState,
  processMove,
  processPass,
  getHint,
  getValidMoves,
  cloneGameState,
} from '../../../shared/game-engine';

@Injectable()
export class GameService {
  /**
   * Create a new game state
   */
  createGame(): GameState {
    return createInitialGameState();
  }

  /**
   * Make a move on the board
   */
  makeMove(
    gameState: GameState,
    row: number,
    col: number,
    playerColor: PlayerColor
  ): { success: boolean; newState: GameState; error?: string } {
    return processMove(gameState, row, col, playerColor);
  }

  /**
   * Pass turn when no valid moves
   */
  passTurn(
    gameState: GameState,
    playerColor: PlayerColor
  ): { success: boolean; newState: GameState; error?: string } {
    return processPass(gameState, playerColor);
  }

  /**
   * Get a hint for the current player
   */
  getHint(gameState: GameState, playerColor: PlayerColor): Position | null {
    return getHint(gameState, playerColor);
  }

  /**
   * Check if a player has valid moves
   */
  hasValidMoves(gameState: GameState, playerColor: PlayerColor): boolean {
    return getValidMoves(gameState.board, playerColor).length > 0;
  }

  /**
   * Clone game state for safe operations
   */
  cloneState(gameState: GameState): GameState {
    return cloneGameState(gameState);
  }
}
