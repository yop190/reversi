/**
 * App Component
 * Modern Reversi Application with Angular Material & Tailwind
 * Supports both single-player (vs AI) and multiplayer modes
 */

import { Component, inject, signal, ViewChild, HostListener, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { BoardComponent } from './components/board/board.component';
import { MenuComponent } from './components/menu/menu.component';
import { StatusBarComponent } from './components/status-bar/status-bar.component';
import { AboutDialogComponent } from './components/about-dialog/about-dialog.component';
import { LobbyComponent } from './components/lobby/lobby.component';
import { GameRoomComponent } from './components/game-room/game-room.component';
import { GameEngineService } from './services/game-engine.service';
import { GameStateService } from './services/game-state.service';
import { WebSocketService } from './services/websocket.service';
import { SkillLevel } from './models/game.types';

type GameMode = 'menu' | 'single-player' | 'multiplayer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatDialogModule,
    BoardComponent,
    MenuComponent,
    StatusBarComponent,
    AboutDialogComponent,
    LobbyComponent,
    GameRoomComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private gameEngine = inject(GameEngineService);
  protected gameState = inject(GameStateService);
  protected ws = inject(WebSocketService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(BoardComponent) boardComponent!: BoardComponent;

  // Game mode: menu, single-player, or multiplayer
  gameMode = signal<GameMode>('menu');
  
  showAboutDialog = signal(false);
  isMobile = signal(window.innerWidth < 640);
  
  // Computed state for multiplayer
  readonly isInRoom = computed(() => this.ws.isInRoom());

  ngOnInit(): void {
    // Connect to server on startup for multiplayer support
    this.ws.connect();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 640);
  }

  // Mode switching
  startSinglePlayer(): void {
    this.gameMode.set('single-player');
    this.gameEngine.newGame();
  }

  startMultiplayer(): void {
    this.gameMode.set('multiplayer');
  }

  goToMenu(): void {
    this.gameMode.set('menu');
    if (this.ws.isInRoom()) {
      this.ws.leaveRoom();
    }
  }

  onHint(): void {
    const hintPos = this.gameEngine.getHint();
    if (hintPos && this.boardComponent) {
      this.boardComponent.showHint(hintPos);
      this.snackBar.open('Hint: Best move highlighted!', 'OK', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom'
      });
      // Clear hint after a short delay
      setTimeout(() => {
        this.boardComponent.clearHint();
      }, 2000);
    } else {
      this.snackBar.open('No hints available', 'OK', {
        duration: 2000
      });
    }
  }

  onPass(): void {
    this.gameEngine.pass();
  }

  onNewGame(): void {
    this.gameEngine.newGame();
    if (this.boardComponent) {
      this.boardComponent.clearHint();
    }
    this.snackBar.open('New game started!', 'OK', {
      duration: 1500,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }

  onExit(): void {
    // In modern context, show confirmation and close
    if (confirm('Exit Reversi?')) {
      window.close();
    }
  }

  onAbout(): void {
    this.showAboutDialog.set(true);
  }

  onCloseAbout(): void {
    this.showAboutDialog.set(false);
  }

  onSkillChange(level: SkillLevel): void {
    this.gameEngine.setSkillLevel(level);
    const levelNames: Record<SkillLevel, string> = {
      [SkillLevel.Beginner]: 'Beginner',
      [SkillLevel.Novice]: 'Novice',
      [SkillLevel.Expert]: 'Expert',
      [SkillLevel.Master]: 'Master'
    };
    this.snackBar.open(`Difficulty: ${levelNames[level]}`, 'OK', {
      duration: 1500
    });
  }
}
