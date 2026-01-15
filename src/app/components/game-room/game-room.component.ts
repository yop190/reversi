/**
 * Game Room Component
 * Multiplayer game view with player info and spectator support
 */

import { Component, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { WebSocketService } from '../../services/websocket.service';
import { I18nService } from '../../services/i18n.service';
import { MultiplayerBoardComponent } from '../multiplayer-board/multiplayer-board.component';
import { PlayerColor } from '@shared/game.types';

@Component({
  selector: 'app-game-room',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MultiplayerBoardComponent,
  ],
  template: `
    <div class="game-room">
      <!-- Room Header -->
      <header class="room-header glass-card">
        <div class="header-left">
          <button mat-icon-button (click)="leaveRoom()" matTooltip="{{ i18n.translate('leaveRoom') }}">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div class="room-info">
            <h2>{{ roomState().room?.name }}</h2>
            <div class="room-meta">
              <span class="room-id">{{ i18n.translate('room') }}: {{ roomState().room?.id }}</span>
              @if (ws.isSpectator()) {
                <mat-chip class="spectator-chip">
                  <mat-icon>visibility</mat-icon>
                  {{ i18n.translate('spectatorMode') }}
                </mat-chip>
              }
            </div>
          </div>
        </div>
        
        <div class="header-actions">
          @if (!ws.isSpectator() && !ws.gameInProgress()) {
            @if (roomState().room?.players?.length === 2) {
              <button mat-raised-button color="primary" (click)="restartGame()">
                <mat-icon>play_arrow</mat-icon>
                {{ i18n.translate('startGame') }}
              </button>
            }
          }
          @if (ws.gameInProgress() && !ws.isSpectator()) {
            <button mat-stroked-button (click)="requestHint()" matTooltip="{{ i18n.translate('hint') }} (H)">
              <mat-icon>lightbulb</mat-icon>
              {{ i18n.translate('hint') }}
            </button>
          }
        </div>
      </header>
      
      <!-- Players Section -->
      <div class="players-section">
        @for (player of players(); track player.id) {
          <div class="player-card glass-card" 
               [class.active]="isPlayerTurn(player.color!)"
               [class.you]="player.id === ws.connectionState().playerId">
            <div class="player-piece" [class.black]="player.color === 'black'" [class.white]="player.color === 'white'">
              <div class="piece-inner"></div>
            </div>
            <div class="player-info">
              <div class="player-name">
                {{ player.username }}
                @if (player.id === ws.connectionState().playerId) {
                  <span class="you-badge">({{ i18n.translate('you') }})</span>
                }
              </div>
              <div class="player-color">{{ player.color === 'black' ? i18n.translate('black') : i18n.translate('white') }}</div>
            </div>
            <div class="player-score">
              {{ getScore(player.color!) }}
            </div>
            @if (isPlayerTurn(player.color!)) {
              <div class="turn-indicator">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            }
          </div>
        }
        
        @if (ws.waitingForOpponent()) {
          <div class="player-card glass-card waiting">
            <div class="player-piece empty">
              <mat-icon>person_add</mat-icon>
            </div>
            <div class="player-info">
              <div class="player-name">{{ i18n.translate('waitingForOpponent') }}</div>
              <div class="waiting-animation">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        }
      </div>
      
      <!-- Game Board -->
      <div class="game-area">
        @if (gameState()) {
          <app-multiplayer-board
            [gameState]="gameState()!"
            [yourColor]="roomState().yourColor"
            [isSpectator]="ws.isSpectator()"
            [isYourTurn]="ws.isMyTurn() ?? false"
            [hint]="ws.hint()"
            (move)="onMove($event)">
          </app-multiplayer-board>
        } @else {
          <div class="waiting-message glass-card">
            @if (ws.waitingForOpponent()) {
              <mat-icon>hourglass_empty</mat-icon>
              <h3>{{ i18n.translate('waitingForOpponent') }}</h3>
              <p>{{ i18n.translate('shareRoomId') }}</p>
              <div class="room-id-display">
                <code>{{ roomState().room?.id }}</code>
                <button mat-icon-button (click)="copyRoomId()" matTooltip="{{ i18n.translate('copyRoomId') }}">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            } @else {
              <mat-icon>sports_esports</mat-icon>
              <h3>{{ i18n.translate('readyToPlay') }}</h3>
              <p>{{ i18n.translate('startGame') }}</p>
            }
          </div>
        }
      </div>
      
      <!-- Game Status -->
      @if (gameState()?.gameOver) {
        <div class="game-over-banner glass-card">
          <mat-icon>emoji_events</mat-icon>
          <div class="result">
            @if (gameState()?.winner === 'draw') {
              <h3>{{ i18n.translate('draw') }}</h3>
            } @else if (gameState()?.winner === roomState().yourColor) {
              <h3>{{ i18n.translate('youWin') }} 🎉</h3>
            } @else if (ws.isSpectator()) {
              <h3>{{ gameState()?.winner === 'black' ? i18n.translate('blackWins') : i18n.translate('whiteWins') }}</h3>
            } @else {
              <h3>{{ i18n.translate('youLose') }}</h3>
            }
            <p>{{ gameState()?.blackScore }} - {{ gameState()?.whiteScore }}</p>
          </div>
          @if (!ws.isSpectator()) {
            <button mat-raised-button color="primary" (click)="restartGame()">
              <mat-icon>refresh</mat-icon>
              {{ i18n.translate('restart') }}
            </button>
          }
        </div>
      }
      
      <!-- Spectators Section -->
      @if (spectators().length > 0) {
        <div class="spectators-section glass-card">
          <div class="spectators-header">
            <mat-icon>visibility</mat-icon>
            <span>{{ spectators().length }} {{ i18n.translate('spectators') }}</span>
          </div>
          <div class="spectator-list">
            @for (spectator of spectators(); track spectator.id) {
              <span class="spectator-name">{{ spectator.username }}</span>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .game-room {
      min-height: 100vh;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-width: 900px;
      margin: 0 auto;
    }
    
    .glass-card {
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 1rem;
    }
    
    /* Header */
    .room-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .room-info h2 {
      margin: 0;
      font-size: 1.25rem;
    }
    
    .room-meta {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-top: 0.25rem;
    }
    
    .room-id {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .spectator-chip {
      font-size: 0.7rem;
      height: 24px;
      background: rgba(124, 58, 237, 0.2) !important;
      color: #a78bfa !important;
    }
    
    .spectator-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    
    /* Players Section */
    .players-section {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .player-card {
      flex: 1;
      min-width: 200px;
      display: flex;
      align-items: center;
      gap: 1rem;
      position: relative;
      transition: all 0.3s;
    }
    
    .player-card.active {
      border-color: rgba(0, 188, 212, 0.5);
      box-shadow: 0 0 20px rgba(0, 188, 212, 0.2);
    }
    
    .player-card.you {
      background: rgba(0, 188, 212, 0.1);
    }
    
    .player-card.waiting {
      opacity: 0.6;
    }
    
    .player-piece {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    
    .player-piece.black {
      background: linear-gradient(145deg, #1e293b, #334155);
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  0 4px 8px rgba(0, 0, 0, 0.3);
    }
    
    .player-piece.white {
      background: linear-gradient(145deg, #f8fafc, #e2e8f0);
      box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.8),
                  0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .player-piece.empty {
      background: rgba(255, 255, 255, 0.1);
      border: 2px dashed rgba(255, 255, 255, 0.3);
    }
    
    .piece-inner {
      width: 36px;
      height: 36px;
      border-radius: 50%;
    }
    
    .player-piece.black .piece-inner {
      background: radial-gradient(circle at 30% 30%, #475569, #1e293b);
    }
    
    .player-piece.white .piece-inner {
      background: radial-gradient(circle at 30% 30%, #ffffff, #cbd5e1);
    }
    
    .player-info {
      flex: 1;
    }
    
    .player-name {
      font-weight: 500;
      font-size: 1rem;
    }
    
    .you-badge {
      font-size: 0.75rem;
      color: rgba(0, 188, 212, 0.8);
      margin-left: 0.25rem;
    }
    
    .player-color {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .player-score {
      font-size: 2rem;
      font-weight: 700;
      color: rgba(255, 255, 255, 0.9);
    }
    
    .turn-indicator {
      position: absolute;
      right: -8px;
      top: 50%;
      transform: translateY(-50%);
      background: var(--mat-primary-color, #00bcd4);
      border-radius: 50%;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 1s infinite;
    }
    
    .turn-indicator mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
    
    .waiting-animation {
      display: flex;
      gap: 4px;
      margin-top: 4px;
    }
    
    .waiting-animation span {
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    
    .waiting-animation span:nth-child(1) { animation-delay: 0s; }
    .waiting-animation span:nth-child(2) { animation-delay: 0.2s; }
    .waiting-animation span:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
    
    /* Game Area */
    .game-area {
      display: flex;
      justify-content: center;
      padding: 1rem 0;
    }
    
    .waiting-message {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 400px;
    }
    
    .waiting-message mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-primary-color, #00bcd4);
      margin-bottom: 1rem;
    }
    
    .waiting-message h3 {
      margin: 0 0 0.5rem 0;
    }
    
    .waiting-message p {
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
    
    .room-id-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
      padding: 0.75rem 1rem;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 8px;
    }
    
    .room-id-display code {
      font-family: monospace;
      font-size: 1.25rem;
      color: var(--mat-primary-color, #00bcd4);
    }
    
    /* Game Over */
    .game-over-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, rgba(0, 188, 212, 0.2), rgba(124, 58, 237, 0.2));
      border-color: rgba(0, 188, 212, 0.3);
      flex-wrap: wrap;
    }
    
    .game-over-banner mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #fbbf24;
    }
    
    .game-over-banner .result {
      text-align: center;
    }
    
    .game-over-banner h3 {
      margin: 0;
      font-size: 1.25rem;
    }
    
    .game-over-banner p {
      margin: 0.25rem 0 0 0;
      color: rgba(255, 255, 255, 0.7);
    }
    
    /* Spectators */
    .spectators-section {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .spectators-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }
    
    .spectators-header mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    .spectator-list {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    
    .spectator-name {
      padding: 0.25rem 0.75rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      font-size: 0.75rem;
    }
    
    /* Responsive */
    @media (max-width: 640px) {
      .room-header {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .header-actions {
        width: 100%;
        display: flex;
        gap: 0.5rem;
      }
      
      .header-actions button {
        flex: 1;
      }
      
      .players-section {
        flex-direction: column;
      }
      
      .player-card {
        min-width: auto;
      }
    }
  `],
})
export class GameRoomComponent implements OnInit {
  ws = inject(WebSocketService);
  i18n = inject(I18nService);
  private snackBar = inject(MatSnackBar);
  
  readonly roomState = this.ws.roomState;
  readonly gameState = this.ws.gameState;
  
  readonly players = computed(() => {
    return this.roomState().room?.players || [];
  });
  
  readonly spectators = computed(() => {
    return this.roomState().room?.spectators || [];
  });
  
  ngOnInit(): void {
    // Listen for errors
  }
  
  leaveRoom(): void {
    this.ws.leaveRoom();
  }
  
  restartGame(): void {
    this.ws.restartGame();
  }
  
  requestHint(): void {
    this.ws.requestHint();
  }
  
  onMove(event: { row: number; col: number }): void {
    this.ws.makeMove(event.row, event.col);
  }
  
  isPlayerTurn(color: PlayerColor): boolean {
    const state = this.gameState();
    return state !== null && state.currentTurn === color && !state.gameOver;
  }
  
  getScore(color: PlayerColor): number {
    const state = this.gameState();
    if (!state) return 2;
    return color === 'black' ? state.blackScore : state.whiteScore;
  }
  
  copyRoomId(): void {
    const roomId = this.roomState().room?.id;
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      this.snackBar.open('Room ID copied!', 'OK', { duration: 2000 });
    }
  }
}
