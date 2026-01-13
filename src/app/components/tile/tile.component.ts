/**
 * Tile Component
 * Modern game board cell with 3D piece rendering
 * Features smooth animations and accessibility support
 */

import { Component, Input, Output, EventEmitter, inject, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellState } from '../../models/game.types';
import { GameEngineService } from '../../services/game-engine.service';

@Component({
    selector: 'app-tile',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="tile-inner" 
         [class.has-piece]="state() !== CellState.Empty"
         role="gridcell"
         [attr.tabindex]="isValidMove ? 0 : -1">
      
      <!-- Valid move indicator -->
      @if (isValidMove && state() === CellState.Empty) {
        <div class="valid-indicator" [class.hint-active]="isHint"></div>
      }

      <!-- Black piece -->
      @if (state() === CellState.Black) {
        <div class="piece black animate-piece">
          <div class="piece-highlight"></div>
        </div>
      }

      <!-- White piece -->
      @if (state() === CellState.White) {
        <div class="piece white animate-piece">
          <div class="piece-highlight"></div>
        </div>
      }
    </div>
  `,
    styles: [`
    :host {
      display: block;
      width: 40px;
      height: 40px;
      box-sizing: border-box;
      border: 1px solid rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent);
      cursor: default;
      position: relative;
      transition: all 0.15s ease;
    }

    /* Responsive sizing */
    @media (min-width: 640px) {
      :host {
        width: 48px;
        height: 48px;
      }
    }

    @media (min-width: 768px) {
      :host {
        width: 56px;
        height: 56px;
      }
    }
    
    :host(.valid-move) {
      cursor: pointer;
    }

    :host(.valid-move):hover {
      background: rgba(255, 255, 255, 0.15);
    }

    :host(.valid-move):focus-visible {
      outline: 2px solid rgb(45, 212, 191);
      outline-offset: -2px;
      z-index: 10;
    }
    
    :host(.hint) {
      background: rgba(45, 212, 191, 0.3);
      box-shadow: inset 0 0 15px rgba(45, 212, 191, 0.4);
    }
    
    .tile-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .valid-indicator {
      position: absolute;
      width: 30%;
      height: 30%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      border: 2px dashed rgba(255, 255, 255, 0.4);
      animation: pulse-soft 2s ease-in-out infinite;
    }

    .valid-indicator.hint-active {
      width: 50%;
      height: 50%;
      background: rgba(45, 212, 191, 0.4);
      border-color: rgb(45, 212, 191);
      animation: pulse-hint 1s ease-in-out infinite;
    }
    
    .piece {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      box-sizing: border-box;
      position: relative;
      transform-style: preserve-3d;
      transition: transform 0.3s ease;
    }

    .piece:hover {
      transform: scale(1.05);
    }

    .piece-highlight {
      position: absolute;
      top: 15%;
      left: 20%;
      width: 25%;
      height: 25%;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.4);
      filter: blur(2px);
    }
    
    .piece.black {
      background: linear-gradient(145deg, #4b5563, #1f2937);
      box-shadow: 
        inset -4px -4px 10px rgba(0, 0, 0, 0.6),
        inset 4px 4px 10px rgba(255, 255, 255, 0.1),
        0 6px 12px rgba(0, 0, 0, 0.5),
        0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .piece.black .piece-highlight {
      background: rgba(255, 255, 255, 0.15);
    }
    
    .piece.white {
      background: linear-gradient(145deg, #ffffff, #d1d5db);
      box-shadow: 
        inset -4px -4px 10px rgba(0, 0, 0, 0.15),
        inset 4px 4px 10px rgba(255, 255, 255, 0.9),
        0 6px 12px rgba(0, 0, 0, 0.3),
        0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .piece.white .piece-highlight {
      background: rgba(255, 255, 255, 0.8);
    }

    .animate-piece {
      animation: piece-drop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes piece-drop {
      0% {
        transform: scale(0) translateY(-20px);
        opacity: 0;
      }
      60% {
        transform: scale(1.1) translateY(0);
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }

    @keyframes pulse-soft {
      0%, 100% { opacity: 0.6; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.1); }
    }

    @keyframes pulse-hint {
      0%, 100% { opacity: 0.7; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.15); }
    }
  `]
})
export class TileComponent {
  @Input({ required: true }) row!: number;
  @Input({ required: true }) col!: number;
  @Input({ required: true }) state!: () => CellState;
  @Input() isHint: boolean = false;

  @Output() tileClick = new EventEmitter<{ row: number; col: number }>();

  private gameEngine = inject(GameEngineService);

  readonly CellState = CellState;

  @HostBinding('class.valid-move')
  get isValidMove(): boolean {
    return this.gameEngine.isValidMove(this.row, this.col);
  }

  @HostBinding('class.hint')
  get showHint(): boolean {
    return this.isHint;
  }

  @HostListener('click')
  onClick(): void {
    this.tileClick.emit({ row: this.row, col: this.col });
  }

  @HostListener('keydown.enter')
  @HostListener('keydown.space')
  onKeyActivate(): void {
    if (this.isValidMove) {
      this.tileClick.emit({ row: this.row, col: this.col });
    }
  }
}
