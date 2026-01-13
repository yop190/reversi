/**
 * Multiplayer Board Component
 * Game board for multiplayer with server-synced state
 */

import { Component, Input, Output, EventEmitter, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameState, CellState, PlayerColor, Position, BOARD_SIZE } from '@shared/game.types';

@Component({
  selector: 'app-multiplayer-board',
  standalone: true,
  imports: [CommonModule],
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
    
    <!-- Board with row labels -->
    <div class="board-wrapper">
      @for (row of rows; track row) {
        <div class="flex items-center">
          <!-- Row label -->
          <div class="w-6 sm:w-8 flex items-center justify-center
                      text-xs sm:text-sm font-medium text-slate-400">
            {{ row + 1 }}
          </div>
          
          <!-- Board cells -->
          @for (col of cols; track col) {
            <button
              class="tile"
              [class.valid-move]="isValidMove(row, col)"
              [class.hint]="isHintPosition(row, col)"
              [class.last-move]="isLastMove(row, col)"
              [class.disabled]="!canClick(row, col)"
              [attr.aria-label]="getAriaLabel(row, col)"
              (click)="onTileClick(row, col)">
              
              <!-- Valid move indicator -->
              @if (isValidMove(row, col) && getCellState(row, col) === CellState.Empty) {
                <div class="valid-indicator" [class.hint-active]="isHintPosition(row, col)"></div>
              }
              
              <!-- Game piece -->
              @if (getCellState(row, col) !== CellState.Empty) {
                <div class="piece" 
                     [class.black]="getCellState(row, col) === CellState.Black"
                     [class.white]="getCellState(row, col) === CellState.White"
                     [class.animate-in]="isLastMove(row, col)">
                  <div class="piece-inner"></div>
                  <div class="piece-shadow"></div>
                </div>
              }
            </button>
          }
        </div>
      }
    </div>
    
    <!-- Turn indicator for players -->
    @if (!isSpectator && isYourTurn && !gameState.gameOver) {
      <div class="your-turn-indicator">
        <span class="pulse-dot"></span>
        Your turn - click a valid move
      </div>
    }
    
    @if (!isSpectator && !isYourTurn && !gameState.gameOver) {
      <div class="waiting-turn">
        Waiting for opponent...
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .board-wrapper {
      display: inline-block;
      background: linear-gradient(145deg, #15803d, #166534);
      border-radius: 12px;
      padding: 8px;
      box-shadow: 
        0 10px 40px rgba(0, 0, 0, 0.4),
        inset 0 2px 4px rgba(255, 255, 255, 0.1);
    }
    
    .tile {
      width: 40px;
      height: 40px;
      background: linear-gradient(145deg, #16a34a, #15803d);
      border: 1px solid rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }
    
    @media (min-width: 640px) {
      .tile {
        width: 48px;
        height: 48px;
      }
    }
    
    .tile:hover:not(.disabled) {
      background: linear-gradient(145deg, #22c55e, #16a34a);
    }
    
    .tile.disabled {
      cursor: default;
    }
    
    .tile.valid-move:not(.disabled) {
      cursor: pointer;
    }
    
    .tile.last-move {
      box-shadow: inset 0 0 0 2px rgba(251, 191, 36, 0.5);
    }
    
    /* Valid move indicator */
    .valid-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.3);
      animation: pulse-indicator 2s infinite;
    }
    
    .valid-indicator.hint-active {
      background: rgba(251, 191, 36, 0.6);
      width: 16px;
      height: 16px;
      animation: pulse-hint 0.8s infinite;
    }
    
    @keyframes pulse-indicator {
      0%, 100% { transform: scale(1); opacity: 0.4; }
      50% { transform: scale(1.2); opacity: 0.7; }
    }
    
    @keyframes pulse-hint {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
      50% { transform: scale(1.1); box-shadow: 0 0 10px 4px rgba(251, 191, 36, 0.2); }
    }
    
    /* Game pieces */
    .piece {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      position: relative;
      transition: transform 0.3s;
    }
    
    @media (min-width: 640px) {
      .piece {
        width: 40px;
        height: 40px;
      }
    }
    
    .piece.animate-in {
      animation: piece-drop 0.3s ease-out;
    }
    
    @keyframes piece-drop {
      0% { transform: scale(0) translateY(-20px); opacity: 0; }
      60% { transform: scale(1.1) translateY(0); }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    
    .piece-inner {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      position: relative;
      z-index: 1;
    }
    
    .piece.black .piece-inner {
      background: linear-gradient(145deg, #334155, #1e293b);
      box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.4),
                  inset 0 2px 4px rgba(255, 255, 255, 0.1);
    }
    
    .piece.white .piece-inner {
      background: linear-gradient(145deg, #ffffff, #e2e8f0);
      box-shadow: inset 0 -2px 4px rgba(0, 0, 0, 0.1),
                  inset 0 2px 4px rgba(255, 255, 255, 0.8);
    }
    
    .piece-shadow {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      height: 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 50%;
      filter: blur(2px);
    }
    
    /* Turn indicators */
    .your-turn-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: rgba(0, 188, 212, 0.2);
      border-radius: 8px;
      color: #00bcd4;
      font-weight: 500;
    }
    
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: #00bcd4;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }
    
    .waiting-turn {
      text-align: center;
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.6);
    }
  `],
})
export class MultiplayerBoardComponent {
  @Input({ required: true }) gameState!: GameState;
  @Input() yourColor: PlayerColor | null = null;
  @Input() isSpectator = false;
  @Input() isYourTurn = false;
  @Input() hint: Position | null = null;
  
  @Output() move = new EventEmitter<{ row: number; col: number }>();
  
  readonly CellState = CellState;
  readonly rows = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  readonly cols = Array.from({ length: BOARD_SIZE }, (_, i) => i);
  
  getColumnLabel(col: number): string {
    return String.fromCharCode(65 + col); // A-H
  }
  
  getCellState(row: number, col: number): CellState {
    return this.gameState.board[row][col];
  }
  
  isValidMove(row: number, col: number): boolean {
    if (this.isSpectator || !this.isYourTurn) return false;
    return this.gameState.validMoves.some((m: Position) => m.row === row && m.col === col);
  }
  
  isHintPosition(row: number, col: number): boolean {
    return this.hint !== null && this.hint.row === row && this.hint.col === col;
  }
  
  isLastMove(row: number, col: number): boolean {
    return this.gameState.lastMove !== null && 
           this.gameState.lastMove.row === row && 
           this.gameState.lastMove.col === col;
  }
  
  canClick(row: number, col: number): boolean {
    return !this.isSpectator && this.isYourTurn && this.isValidMove(row, col);
  }
  
  getAriaLabel(row: number, col: number): string {
    const colLabel = this.getColumnLabel(col);
    const state = this.getCellState(row, col);
    let content = 'Empty';
    if (state === CellState.Black) content = 'Black piece';
    else if (state === CellState.White) content = 'White piece';
    
    const isValid = this.isValidMove(row, col);
    return `${colLabel}${row + 1}: ${content}${isValid ? ', valid move' : ''}`;
  }
  
  onTileClick(row: number, col: number): void {
    if (this.canClick(row, col)) {
      this.move.emit({ row, col });
    }
  }
}
