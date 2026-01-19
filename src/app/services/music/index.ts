/**
 * Adaptive Music System - Public API
 * 
 * Re-exports all public types and services for the adaptive music system.
 * Import from this file for clean access to music functionality.
 * 
 * @example
 * import { AdaptiveMusicService, GameMode, MusicState } from './services/music';
 */

// Services
export { AdaptiveMusicService, GameMode, MusicLayer } from './adaptive-music.service';
export { 
  AdvantageCalculatorService, 
  MusicState, 
  GamePhase,
  type AdvantageMetrics,
  type AdvantageConfig 
} from './advantage-calculator.service';

// Re-export for convenience
export type { SoundType } from './sound.service';
