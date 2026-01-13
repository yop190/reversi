/**
 * Status Bar Component
 * Modern score display with elegant piece counters
 * Shows current player, scores, and game status
 */

import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { Player } from '../../models/game.types';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
      <!-- Black (Human) Score -->
      <div class="score-card" 
           [class.active]="isHumanTurn()"
           [class.winner]="gameState.gameOver() && gameState.winner() === Player.Human">
        <div class="flex items-center gap-3">
          <!-- Piece indicator -->
          <div class="piece-display black">
            <div class="piece-3d"></div>
          </div>
          
          <div class="score-info">
            <span class="player-label">You</span>
            <span class="score-value">{{ gameState.score().black }}</span>
          </div>
        </div>
        
        <!-- Turn indicator -->
        @if (isHumanTurn() && !gameState.gameOver()) {
          <div class="turn-indicator">
            <span class="turn-dot"></span>
            Your turn
          </div>
        }
        @if (gameState.gameOver() && gameState.winner() === Player.Human) {
          <div class="winner-badge">
            <span class="material-symbols-outlined">emoji_events</span>
            Winner!
          </div>
        }
      </div>

      <!-- VS Divider -->
      <div class="vs-divider">
        <span class="vs-text">VS</span>
        @if (!gameState.gameOver()) {
          <div class="vs-line"></div>
        }
        @if (gameState.gameOver() && !gameState.winner()) {
          <span class="tie-text">TIE</span>
        }
      </div>

      <!-- White (Computer) Score -->
      <div class="score-card" 
           [class.active]="!isHumanTurn() && !gameState.gameOver()"
           [class.winner]="gameState.gameOver() && gameState.winner() === Player.Computer">
        <div class="flex items-center gap-3">
          <!-- Piece indicator -->
          <div class="piece-display white">
            <div class="piece-3d"></div>
          </div>
          
          <div class="score-info">
            <span class="player-label">AI</span>
            <span class="score-value">{{ gameState.score().white }}</span>
          </div>
        </div>
        
        <!-- Turn indicator -->
        @if (!isHumanTurn() && !gameState.gameOver()) {
          <div class="turn-indicator thinking">
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            <span class="thinking-dot"></span>
            Thinking
          </div>
        }
        @if (gameState.gameOver() && gameState.winner() === Player.Computer) {
          <div class="winner-badge">
            <span class="material-symbols-outlined">emoji_events</span>
            Winner!
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .score-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      border-radius: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      min-width: 140px;
    }

    .score-card.active {
      background: rgba(20, 184, 166, 0.15);
      border-color: rgba(20, 184, 166, 0.4);
      box-shadow: 0 0 20px rgba(20, 184, 166, 0.2);
    }

    .score-card.winner {
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(245, 158, 11, 0.1));
      border-color: rgba(234, 179, 8, 0.5);
      box-shadow: 0 0 30px rgba(234, 179, 8, 0.3);
    }

    .piece-display {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .piece-display.black .piece-3d {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(145deg, #374151, #1f2937);
      box-shadow: 
        inset -3px -3px 6px rgba(0, 0, 0, 0.5),
        inset 3px 3px 6px rgba(255, 255, 255, 0.1),
        0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .piece-display.white .piece-3d {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(145deg, #ffffff, #e5e7eb);
      box-shadow: 
        inset -3px -3px 6px rgba(0, 0, 0, 0.1),
        inset 3px 3px 6px rgba(255, 255, 255, 0.8),
        0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .score-info {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .player-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: rgba(255, 255, 255, 0.6);
      font-weight: 500;
    }

    .score-value {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      line-height: 1;
    }

    .turn-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      color: rgb(45, 212, 191);
      font-weight: 500;
    }

    .turn-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: rgb(45, 212, 191);
      animation: pulse 1.5s ease-in-out infinite;
    }

    .turn-indicator.thinking {
      color: rgba(255, 255, 255, 0.7);
    }

    .thinking-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.6);
      animation: bounce 1.4s ease-in-out infinite;
    }

    .thinking-dot:nth-child(1) { animation-delay: 0s; }
    .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
    .thinking-dot:nth-child(3) { animation-delay: 0.4s; }

    .winner-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.75rem;
      color: rgb(234, 179, 8);
      font-weight: 600;
    }

    .winner-badge .material-symbols-outlined {
      font-size: 1rem;
    }

    .vs-divider {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }

    .vs-text {
      font-size: 0.875rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.4);
      letter-spacing: 0.1em;
    }

    .vs-line {
      width: 1px;
      height: 24px;
      background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.2), transparent);
    }

    .tie-text {
      font-size: 0.625rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.6);
      letter-spacing: 0.15em;
      padding: 0.25rem 0.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }
  `]
})
export class StatusBarComponent {
  gameState = inject(GameStateService);
  readonly Player = Player;

  isHumanTurn = computed(() => this.gameState.currentPlayer() === Player.Human);
}
