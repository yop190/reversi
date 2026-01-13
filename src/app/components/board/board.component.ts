/**
 * Board Component
 * Modern 8x8 Reversi game board with elegant styling
 * Responsive design with smooth animations
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
    <!-- Column labels (A-H) -->
    <div class="flex justify-center mb-2">
      <div class="w-6 sm:w-8"></div>
      @for (col of cols; track col) {
        <div class="w-10 h-6 sm:w-12 sm:h-8 flex items-center justify-center 
                    text-xs sm:text-sm font-medium text-slate-400">
          {{ getColumnLabel(col) }}
        </div>
      }
    </div>

    <div class="flex">
      <!-- Row labels (1-8) -->
      <div class="flex flex-col">
        @for (row of rows; track row) {
          <div class="w-6 h-10 sm:w-8 sm:h-12 flex items-center justify-center 
                      text-xs sm:text-sm font-medium text-slate-400">
            {{ row }}
          </div>
        }
      </div>

      <!-- Game Board -->
      <div class="board" role="grid" aria-label="Reversi game board">
        @for (row of rows; track row) {
          <div class="board-row" role="row">
            @for (col of cols; track col) {
              <app-tile
                [row]="row"
                [col]="col"
                [state]="getCellState(row, col)"
                [isHint]="isHintPosition(row, col)"
                (tileClick)="onTileClick($event)"
                [attr.aria-label]="getTileLabel(row, col)"
              ></app-tile>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .board {
      display: flex;
      flex-direction: column;
      border-radius: 0.75rem;
      overflow: hidden;
      background: linear-gradient(135deg, #065f46, #047857, #059669);
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.1),
        0 4px 6px rgba(0, 0, 0, 0.3),
        0 10px 30px rgba(0, 0, 0, 0.4);
      border: 3px solid #064e3b;
    }
    
    .board-row {
      display: flex;
    }

    /* Responsive sizing handled in tile component */
  `]
})
export class BoardComponent {
  private gameState = inject(GameStateService);
  private gameEngine = inject(GameEngineService);

  // Board dimensions
  readonly rows = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);
  readonly cols = Array.from({ length: BOARD_SIZE }, (_, i) => i + 1);

  // Column labels
  private readonly columnLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // Current hint position
  hintPosition = signal<Position | null>(null);

  /**
   * Get column label (A-H)
   */
  getColumnLabel(col: number): string {
    return this.columnLabels[col - 1];
  }

  /**
   * Get accessible tile label
   */
  getTileLabel(row: number, col: number): string {
    const state = this.gameState.getCellState(row, col);
    const position = `${this.columnLabels[col - 1]}${row}`;
    if (state === CellState.Black) return `${position}: Black piece`;
    if (state === CellState.White) return `${position}: White piece`;
    if (this.gameEngine.isValidMove(row, col)) return `${position}: Valid move`;
    return `${position}: Empty`;
  }

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
