import { EventEmitter } from 'events';

/**
 * Lightweight cross-module event bus.
 *
 * Used to bridge MCP REST calls → WebSocket broadcasts.
 * When the MCP controller processes a move, it emits an event
 * here; the GameGateway listens and pushes the update to all
 * connected browser clients in the room.
 */
export const gameEvents = new EventEmitter();

// ── Event names ──────────────────────────────────────────────
export const GAME_STATE_UPDATED = 'game:stateUpdated';
export const GAME_STARTED = 'game:started';
export const GAME_OVER = 'game:over';
export const PLAYER_JOINED = 'game:playerJoined';
export const PLAYER_LEFT = 'game:playerLeft';
export const TURN_PASSED = 'game:turnPassed';

// ── Payload types ────────────────────────────────────────────
export interface GameStateEvent {
  roomId: string;
  gameState: unknown;
  message?: string;
}

export interface PlayerEvent {
  roomId: string;
  player: unknown;
  isSpectator: boolean;
}
