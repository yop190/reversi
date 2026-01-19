/**
 * Advantage Calculator Service
 * Calculates real-time game advantage for adaptive music system
 * 
 * The advantage score ranges from -1.0 (losing) to +1.0 (winning)
 * Used to drive subtle music adaptations based on game state
 */

import { Injectable, computed, signal, inject } from '@angular/core';
import { GameStateService } from './game-state.service';
import { MoveValidationService } from './move-validation.service';
import { CellState, Player, BOARD_SIZE } from '../models/game.types';

/**
 * Game phase enumeration
 * Affects how different metrics are weighted in advantage calculation
 */
export enum GamePhase {
  Early = 'early',   // 0-20 moves: Opening strategies, disc count less important
  Mid = 'mid',       // 21-44 moves: Balanced gameplay
  Late = 'late'      // 45+ moves: Endgame, disc count more important
}

/**
 * Music state derived from advantage score
 */
export enum MusicState {
  Winning = 'winning',   // AdvantageScore >= +0.35
  Neutral = 'neutral',   // -0.35 < AdvantageScore < +0.35
  Losing = 'losing'      // AdvantageScore <= -0.35
}

/**
 * Detailed advantage metrics for debugging and UI
 */
export interface AdvantageMetrics {
  discDifference: number;      // DD: Normalized disc count difference
  cornerControl: number;       // CC: Corner position advantage
  mobility: number;            // MB: Legal move advantage
  rawScore: number;            // Score before phase modifier
  phaseModifier: number;       // Game phase weight adjustment
  finalScore: number;          // Final clamped advantage score
  gamePhase: GamePhase;        // Current game phase
  musicState: MusicState;      // Derived music state
  moveCount: number;           // Total moves played
}

/**
 * Configuration for advantage calculation weights
 */
export interface AdvantageConfig {
  discDifferenceWeight: number;   // Default: 0.30
  cornerControlWeight: number;    // Default: 0.40
  mobilityWeight: number;         // Default: 0.20
  stabilityWeight: number;        // Default: 0.10 (optional future metric)
  winningThreshold: number;       // Default: 0.35
  losingThreshold: number;        // Default: -0.35
}

const DEFAULT_CONFIG: AdvantageConfig = {
  discDifferenceWeight: 0.30,
  cornerControlWeight: 0.40,
  mobilityWeight: 0.20,
  stabilityWeight: 0.10,
  winningThreshold: 0.35,
  losingThreshold: -0.35
};

// Corner positions (1-indexed to match internal board)
const CORNERS = [
  { row: 1, col: 1 },
  { row: 1, col: 8 },
  { row: 8, col: 1 },
  { row: 8, col: 8 }
];

// Maximum possible moves (approximation for normalization)
const MAX_POSSIBLE_MOVES = 30;

@Injectable({
  providedIn: 'root'
})
export class AdvantageCalculatorService {
  private gameState = inject(GameStateService);
  private moveValidation = inject(MoveValidationService);

  // Configuration (can be adjusted per game mode)
  private _config = signal<AdvantageConfig>(DEFAULT_CONFIG);

  // Computed advantage metrics
  readonly metrics = computed<AdvantageMetrics>(() => {
    return this.calculateAdvantageMetrics();
  });

  // Convenience computed values
  readonly advantageScore = computed<number>(() => this.metrics().finalScore);
  readonly musicState = computed<MusicState>(() => this.metrics().musicState);
  readonly gamePhase = computed<GamePhase>(() => this.metrics().gamePhase);

  /**
   * Get current configuration
   */
  get config(): AdvantageConfig {
    return this._config();
  }

  /**
   * Update configuration (useful for different game modes)
   */
  setConfig(config: Partial<AdvantageConfig>): void {
    this._config.set({ ...this._config(), ...config });
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this._config.set(DEFAULT_CONFIG);
  }

  /**
   * Calculate all advantage metrics from current game state
   * Called automatically via computed signal when game state changes
   */
  private calculateAdvantageMetrics(): AdvantageMetrics {
    const board = this.gameState.board();
    const score = this.gameState.score();
    const config = this._config();

    // Calculate move count (total discs - 4 initial pieces)
    const moveCount = score.black + score.white - 4;

    // Determine game phase
    const gamePhase = this.determineGamePhase(moveCount);

    // Calculate individual metrics
    const discDifference = this.calculateDiscDifference(score.black, score.white);
    const cornerControl = this.calculateCornerControl(board);
    const mobility = this.calculateMobility(board);

    // Calculate raw weighted score
    const rawScore = 
      (config.discDifferenceWeight * discDifference) +
      (config.cornerControlWeight * cornerControl) +
      (config.mobilityWeight * mobility);

    // Apply game phase modifier
    const phaseModifier = this.getPhaseModifier(gamePhase, discDifference);
    const modifiedScore = rawScore * phaseModifier;

    // Clamp final score to [-1.0, +1.0]
    const finalScore = Math.max(-1.0, Math.min(1.0, modifiedScore));

    // Determine music state
    const musicState = this.determineMusicState(finalScore, config);

    return {
      discDifference,
      cornerControl,
      mobility,
      rawScore,
      phaseModifier,
      finalScore,
      gamePhase,
      musicState,
      moveCount
    };
  }

  /**
   * Calculate normalized disc difference
   * DD = (PlayerDiscs - OpponentDiscs) / TotalDiscs
   * Range: [-1.0, +1.0]
   */
  private calculateDiscDifference(playerDiscs: number, opponentDiscs: number): number {
    const total = playerDiscs + opponentDiscs;
    if (total === 0) return 0;
    return (playerDiscs - opponentDiscs) / total;
  }

  /**
   * Calculate corner control advantage
   * CC = (PlayerCorners - OpponentCorners) / 4
   * Range: [-1.0, +1.0]
   * 
   * Corners are strategically critical in Reversi - they cannot be flipped
   */
  private calculateCornerControl(board: CellState[][]): number {
    let playerCorners = 0;
    let opponentCorners = 0;

    for (const corner of CORNERS) {
      const cell = board[corner.row]?.[corner.col];
      if (cell === CellState.Black) {
        playerCorners++;
      } else if (cell === CellState.White) {
        opponentCorners++;
      }
    }

    return (playerCorners - opponentCorners) / 4;
  }

  /**
   * Calculate mobility advantage
   * MB = (PlayerLegalMoves - OpponentLegalMoves) / MaxPossibleMoves
   * Range: approximately [-1.0, +1.0]
   * 
   * Having more legal moves gives strategic flexibility
   */
  private calculateMobility(board: CellState[][]): number {
    const playerMoves = this.moveValidation.getValidMoves(board, Player.Human);
    const opponentMoves = this.moveValidation.getValidMoves(board, Player.Computer);

    const difference = playerMoves.length - opponentMoves.length;
    
    // Normalize by maximum possible moves
    // Clamp to reasonable range
    return Math.max(-1.0, Math.min(1.0, difference / MAX_POSSIBLE_MOVES));
  }

  /**
   * Determine current game phase based on move count
   */
  private determineGamePhase(moveCount: number): GamePhase {
    if (moveCount <= 20) {
      return GamePhase.Early;
    } else if (moveCount <= 44) {
      return GamePhase.Mid;
    } else {
      return GamePhase.Late;
    }
  }

  /**
   * Get phase modifier to adjust metric weights based on game phase
   * 
   * Early game: Reduce disc difference impact (positions matter more)
   * Mid game: Balanced
   * Late game: Increase disc difference impact (endgame counting)
   */
  private getPhaseModifier(phase: GamePhase, discDifference: number): number {
    switch (phase) {
      case GamePhase.Early:
        // Early game: Reduce the impact of disc count
        // Players often sacrifice discs for position early on
        return 0.7;
      
      case GamePhase.Mid:
        // Mid game: Normal weighting
        return 1.0;
      
      case GamePhase.Late:
        // Late game: Amplify disc count importance
        // The final disc count determines the winner
        return 1.2;
      
      default:
        return 1.0;
    }
  }

  /**
   * Determine music state from advantage score
   */
  private determineMusicState(score: number, config: AdvantageConfig): MusicState {
    if (score >= config.winningThreshold) {
      return MusicState.Winning;
    } else if (score <= config.losingThreshold) {
      return MusicState.Losing;
    } else {
      return MusicState.Neutral;
    }
  }

  /**
   * Get a smooth interpolation factor for continuous music adaptation
   * Returns a value between 0.0 and 1.0 where:
   * 0.0 = maximally losing
   * 0.5 = neutral
   * 1.0 = maximally winning
   */
  getInterpolationFactor(): number {
    const score = this.advantageScore();
    // Convert from [-1, 1] to [0, 1]
    return (score + 1) / 2;
  }

  /**
   * Get intensity level based on absolute advantage
   * Higher values when game is more decisive (either direction)
   * Returns 0.0 (balanced game) to 1.0 (decisive advantage)
   */
  getIntensityLevel(): number {
    return Math.abs(this.advantageScore());
  }

  /**
   * Check if the game is currently in a critical/tense moment
   * (close score in late game, or corner just taken)
   */
  isTenseMoment(): boolean {
    const metrics = this.metrics();
    
    // Late game with close score is tense
    if (metrics.gamePhase === GamePhase.Late && Math.abs(metrics.finalScore) < 0.2) {
      return true;
    }
    
    return false;
  }

  /**
   * Get normalized corner urgency
   * Higher when corners are still available and game is progressing
   */
  getCornerUrgency(): number {
    const metrics = this.metrics();
    const board = this.gameState.board();
    
    let emptyCorners = 0;
    for (const corner of CORNERS) {
      if (board[corner.row]?.[corner.col] === CellState.Empty) {
        emptyCorners++;
      }
    }
    
    // Corner urgency increases in mid-game when corners are still available
    if (metrics.gamePhase === GamePhase.Mid && emptyCorners > 0) {
      return emptyCorners / 4;
    }
    
    return 0;
  }
}
