/**
 * Board Component
 * Displays the 8x8 Reversi game board
 * Replicates the layout of original Windows 2.0 Reversi
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TileComponent } from '../tile/tile.component';
import { GameStateService } from '../../services/game-state.service';
import { GameEngineService } from '../../services/game-engine.service';
import { CellState, BOARD_SIZE, Position } from '../../models/game.types';

@Component({
  selector: 'app-board',
  standalone: true,
  imports: [CommonModule, TileComponent],
  template: `
    <div class="board-container">
      <div class="board">
        @for (row of rows; track row) {
          <div class="board-row">
            @for (col of cols; track col) {
              <app-tile
                [row]="row"
                [col]="col"
                [state]="getCellState(row, col)"
                [isHint]="isHintPosition(row, col)"
                (tileClick)="onTileClick($event)"
              ></app-tile>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .board-container {
      display: inline-block;
      padding: 4px;
      background-color: #000000;
    }
    
    .board {
      display: flex;
      flex-direction: column;
      background-color: #008000;
      border: 2px solid #000000;
    }
    
    .board-row {
      display: flex;
    }
  `]
})
export class BoardComponent {
  private gameState = inject(GameStateService);
  private gameEngine = inject(GameEngineService);
  
  // Board dimensions
  readonly rows = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);
  readonly cols = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);
  
  // Current hint position
  hintPosition = signal<Position | null>(null);
  
  /**
   * Get cell state as a function (for change detection)
   */
  getCellState(row: number, col: number): () => CellState {
    return () => this.gameState.getCellState(row, col);
  }
  
  /**
   * Check if position is the hint position
   */
  isHintPosition(row: number, col: number): boolean {
    const hint = this.hintPosition();
    return hint !== null && hint.row === row && hint.col === col;
  }
  
  /**
   * Handle tile click
   */
  onTileClick(event: { row: number; col: number }): void {
    // Clear hint when making a move
    this.hintPosition.set(null);
    this.gameEngine.makeMove(event.row, event.col);
  }
  
  /**
   * Show hint at position
   */
  showHint(position: Position | null): void {
    this.hintPosition.set(position);
  }
  
  /**
   * Clear hint
   */
  clearHint(): void {
    this.hintPosition.set(null);
  }
}
