/**
 * Tile Component
 * Represents a single cell on the Reversi board
 * Replicates the appearance of original Windows 2.0 tiles
 */

import { Component, Input, Output, EventEmitter, computed, inject, HostBinding, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CellState } from '../../models/game.types';
import { GameEngineService } from '../../services/game-engine.service';

@Component({
  selector: 'app-tile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="tile-inner" [class.has-piece]="state() !== CellState.Empty">
      @if (state() === CellState.Black) {
        <div class="piece black"></div>
      }
      @if (state() === CellState.White) {
        <div class="piece white"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 32px;
      height: 32px;
      box-sizing: border-box;
      border: 1px solid #000000;
      background-color: #008000;
      cursor: default;
    }
    
    :host(.valid-move) {
      cursor: crosshair;
    }
    
    :host(.hint) {
      background-color: #00a000;
    }
    
    .tile-inner {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .piece {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      box-sizing: border-box;
    }
    
    .piece.black {
      background: radial-gradient(circle at 30% 30%, #444444, #000000);
      border: 1px solid #000000;
    }
    
    .piece.white {
      background: radial-gradient(circle at 30% 30%, #ffffff, #cccccc);
      border: 1px solid #666666;
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
}
