/**
 * Lobby Component
 * Main entry point for multiplayer - username entry and room selection
 */

import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WebSocketService } from '../../services/websocket.service';
import { I18nService } from '../../services/i18n.service';
import { RoomSummary } from '@shared/game.types';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatListModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="lobby-container">
      <!-- Username Entry (if not set) -->
      @if (!hasUsername()) {
        <div class="username-card glass-card">
          <div class="card-header">
            <mat-icon class="logo-icon">sports_esports</mat-icon>
            <h1>{{ i18n.translate('multiplayer') }} Reversi</h1>
            <p class="subtitle">{{ i18n.translate('enterUsername') }}</p>
          </div>
          
          <div class="username-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>{{ i18n.translate('username') }}</mat-label>
              <input matInput 
                     [(ngModel)]="usernameInput" 
                     (keyup.enter)="setUsername()"
                     placeholder="..."
                     maxlength="20">
              <mat-icon matSuffix>person</mat-icon>
            </mat-form-field>
            
            <button mat-raised-button 
                    color="primary" 
                    class="join-btn"
                    [disabled]="!usernameInput.trim()"
                    (click)="setUsername()">
              <mat-icon>login</mat-icon>
              {{ i18n.translate('enterLobby') }}
            </button>
          </div>
          
          @if (!ws.isConnected()) {
            <div class="connecting-message">
              <mat-spinner diameter="20"></mat-spinner>
              <span>{{ i18n.translate('connecting') }}</span>
            </div>
          }
        </div>
      }
      
      <!-- Lobby View -->
      @if (hasUsername()) {
        <div class="lobby-content">
          <!-- Header -->
          <div class="lobby-header glass-card">
            <div class="header-left">
              <mat-icon class="lobby-icon">groups</mat-icon>
              <div>
                <h2>{{ i18n.translate('gameLobby') }}</h2>
                <p class="online-count">
                  <span class="online-dot"></span>
                  {{ ws.lobbyState().onlineCount }} {{ i18n.translate('playersOnline') }}
                </p>
              </div>
            </div>
            <div class="header-right">
              <span class="username-badge">
                <mat-icon>person</mat-icon>
                {{ ws.connectionState().username }}
              </span>
              <button mat-icon-button color="warn" (click)="disconnect()" matTooltip="{{ i18n.translate('disconnect') }}">
                <mat-icon>logout</mat-icon>
              </button>
            </div>
          </div>
          
          <!-- Actions -->
          <div class="lobby-actions">
            <button mat-raised-button 
                    color="primary" 
                    class="create-room-btn"
                    (click)="createRoom()">
              <mat-icon>add</mat-icon>
              {{ i18n.translate('createNewRoom') }}
            </button>
            
            <button mat-stroked-button 
                    color="accent"
                    (click)="quickJoin()">
              <mat-icon>flash_on</mat-icon>
              {{ i18n.translate('quickJoin') }}
            </button>
          </div>
          
          <!-- Room List -->
          <div class="rooms-section glass-card">
            <h3>
              <mat-icon>meeting_room</mat-icon>
              {{ i18n.translate('availableRooms') }}
            </h3>
            
            @if (ws.lobbyState().rooms.length === 0) {
              <div class="empty-rooms">
                <mat-icon>inbox</mat-icon>
                <p>{{ i18n.translate('noRoomsAvailable') }}</p>
                <p class="hint">{{ i18n.translate('createNewRoom') }}!</p>
              </div>
            } @else {
              <div class="room-list">
                @for (room of ws.lobbyState().rooms; track room.id) {
                  <div class="room-item" [class.in-progress]="room.inProgress">
                    <div class="room-info">
                      <div class="room-name">{{ room.name }}</div>
                      <div class="room-meta">
                        <span class="player-count">
                          <mat-icon>person</mat-icon>
                          {{ room.playerCount }}/2 {{ i18n.translate('players') }}
                        </span>
                        @if (room.spectatorCount > 0) {
                          <span class="spectator-count">
                            <mat-icon>visibility</mat-icon>
                            {{ room.spectatorCount }} {{ i18n.translate('watching') }}
                          </span>
                        }
                      </div>
                    </div>
                    
                    <div class="room-status">
                      @if (room.inProgress) {
                        <mat-chip class="status-chip in-progress">
                          <mat-icon>play_circle</mat-icon>
                          {{ i18n.translate('inProgress') }}
                        </mat-chip>
                      } @else if (room.playerCount < 2) {
                        <mat-chip class="status-chip waiting">
                          <mat-icon>hourglass_empty</mat-icon>
                          {{ i18n.translate('waiting') }}
                        </mat-chip>
                      } @else {
                        <mat-chip class="status-chip ready">
                          <mat-icon>check_circle</mat-icon>
                          {{ i18n.translate('ready') }}
                        </mat-chip>
                      }
                    </div>
                    
                    <button mat-stroked-button 
                            color="primary"
                            (click)="joinRoom(room.id)">
                      @if (room.playerCount < 2) {
                        <ng-container>
                          <mat-icon>login</mat-icon>
                          {{ i18n.translate('join') }}
                        </ng-container>
                      } @else {
                        <ng-container>
                          <mat-icon>visibility</mat-icon>
                          {{ i18n.translate('watch') }}
                        </ng-container>
                      }
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .lobby-container {
      min-height: 100vh;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
    }
    
    .glass-card {
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 2rem;
    }
    
    /* Username Card */
    .username-card {
      max-width: 400px;
      width: 100%;
      text-align: center;
      animation: slideUp 0.5s ease-out;
    }
    
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .card-header {
      margin-bottom: 2rem;
    }
    
    .logo-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: var(--mat-primary-color, #00bcd4);
      margin-bottom: 1rem;
    }
    
    .card-header h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 600;
      background: linear-gradient(135deg, #00bcd4, #7c3aed);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .subtitle {
      color: rgba(255, 255, 255, 0.6);
      margin-top: 0.5rem;
    }
    
    .username-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .full-width {
      width: 100%;
    }
    
    .join-btn {
      height: 48px;
      font-size: 1rem;
    }
    
    .connecting-message {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      color: rgba(255, 255, 255, 0.6);
      font-size: 0.875rem;
    }
    
    /* Lobby Content */
    .lobby-content {
      width: 100%;
      max-width: 800px;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      animation: fadeIn 0.3s ease-out;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    
    .lobby-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
    }
    
    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .lobby-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: var(--mat-primary-color, #00bcd4);
    }
    
    .lobby-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .online-count {
      margin: 0;
      margin-top: 0.25rem;
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    .online-dot {
      width: 8px;
      height: 8px;
      background: #22c55e;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .username-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(0, 188, 212, 0.2);
      border-radius: 20px;
      font-size: 0.875rem;
    }
    
    .username-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    
    /* Actions */
    .lobby-actions {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .create-room-btn {
      flex: 1;
      min-width: 200px;
      height: 48px;
    }
    
    /* Rooms Section */
    .rooms-section {
      padding: 1.5rem;
    }
    
    .rooms-section h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 1.5rem 0;
      font-size: 1.125rem;
      font-weight: 500;
    }
    
    .empty-rooms {
      text-align: center;
      padding: 3rem 1rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .empty-rooms mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
    }
    
    .empty-rooms p {
      margin: 0;
    }
    
    .empty-rooms .hint {
      font-size: 0.875rem;
      margin-top: 0.5rem;
    }
    
    .room-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    
    .room-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      transition: all 0.2s;
    }
    
    .room-item:hover {
      background: rgba(255, 255, 255, 0.08);
      border-color: rgba(0, 188, 212, 0.3);
    }
    
    .room-item.in-progress {
      border-color: rgba(124, 58, 237, 0.3);
    }
    
    .room-info {
      flex: 1;
    }
    
    .room-name {
      font-weight: 500;
      font-size: 1rem;
    }
    
    .room-meta {
      display: flex;
      gap: 1rem;
      margin-top: 0.25rem;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
    }
    
    .room-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    
    .room-meta mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    
    .status-chip {
      font-size: 0.75rem;
    }
    
    .status-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    
    .status-chip.waiting {
      background: rgba(251, 191, 36, 0.2) !important;
      color: #fbbf24 !important;
    }
    
    .status-chip.in-progress {
      background: rgba(124, 58, 237, 0.2) !important;
      color: #a78bfa !important;
    }
    
    .status-chip.ready {
      background: rgba(34, 197, 94, 0.2) !important;
      color: #22c55e !important;
    }
    
    /* Responsive */
    @media (max-width: 640px) {
      .lobby-container {
        padding: 1rem;
      }
      
      .lobby-header {
        flex-direction: column;
        gap: 1rem;
        text-align: center;
      }
      
      .header-left {
        flex-direction: column;
      }
      
      .lobby-actions {
        flex-direction: column;
      }
      
      .room-item {
        flex-wrap: wrap;
      }
      
      .room-status {
        order: 3;
        width: 100%;
        margin-top: 0.5rem;
      }
    }
  `],
})
export class LobbyComponent implements OnInit, OnDestroy {
  ws = inject(WebSocketService);
  i18n = inject(I18nService);
  
  usernameInput = '';
  
  ngOnInit(): void {
    this.ws.connect();
  }
  
  ngOnDestroy(): void {
    // Don't disconnect - let app component manage connection
  }
  
  hasUsername(): boolean {
    return this.ws.isConnected() && this.ws.connectionState().username !== '';
  }
  
  setUsername(): void {
    const username = this.usernameInput.trim();
    if (username) {
      this.ws.setUsername(username);
    }
  }

  disconnect(): void {
    this.ws.disconnect();
    this.usernameInput = '';
  }
  
  createRoom(): void {
    const roomName = `${this.ws.connectionState().username}'s Room`;
    this.ws.createRoom(roomName);
  }
  
  joinRoom(roomId: string): void {
    this.ws.joinRoom(roomId);
  }
  
  quickJoin(): void {
    // Find first available room or create new one
    const rooms = this.ws.lobbyState().rooms;
    const availableRoom = rooms.find((r: RoomSummary) => r.playerCount < 2);
    
    if (availableRoom) {
      this.ws.joinRoom(availableRoom.id);
    } else {
      this.createRoom();
    }
  }
}
