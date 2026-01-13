/**
 * Status Bar Component
 * Displays game score and messages
 * Replicates the score display of original Windows 2.0 Reversi
 */

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';

@Component({
  selector: 'app-status-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-bar">
      <div class="score-section">
        <span class="score-item">
          <span class="piece-indicator black"></span>
          <span class="score-label">Black:</span>
          <span class="score-value">{{ gameState.score().black }}</span>
        </span>
        <span class="score-item">
          <span class="piece-indicator white"></span>
          <span class="score-label">White:</span>
          <span class="score-value">{{ gameState.score().white }}</span>
        </span>
      </div>
      @if (gameState.message(); as message) {
        <div class="message-section">
          {{ message }}
        </div>
      }
    </div>
  `,
  styles: [`
    .status-bar {
      background-color: #c0c0c0;
      border-top: 1px solid #808080;
      padding: 4px 8px;
      font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
    }
    
    .score-section {
      display: flex;
      gap: 24px;
    }
    
    .score-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .piece-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid #000000;
    }
    
    .piece-indicator.black {
      background-color: #000000;
    }
    
    .piece-indicator.white {
      background-color: #ffffff;
    }
    
    .score-label {
      color: #000000;
    }
    
    .score-value {
      font-weight: bold;
      min-width: 20px;
    }
    
    .message-section {
      margin-top: 4px;
      padding: 2px 4px;
      background-color: #ffff00;
      border: 1px solid #000000;
      color: #000000;
    }
  `]
})
export class StatusBarComponent {
  gameState = inject(GameStateService);
}
