/**
 * App Component
 * Modern Reversi Application with Angular Material & Tailwind
 * Supports both single-player (vs AI) and multiplayer modes
 * 
 * Security: Requires Google OAuth 2.0 authentication for multiplayer
 * Localization: Supports EN, FR, NL, DA
 * Audio: Features adaptive music system that responds to game state
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
import { LeaderboardComponent } from './components/leaderboard/leaderboard.component';
import { LoginComponent } from './components/login/login.component';
import { LanguageSelectorComponent } from './components/language-selector/language-selector.component';
import { MusicToggleComponent } from './components/music-toggle/music-toggle.component';
import { GameEngineService } from './services/game-engine.service';
import { GameStateService } from './services/game-state.service';
import { WebSocketService } from './services/websocket.service';
import { AuthService } from './services/auth.service';
import { I18nService } from './services/i18n.service';
import { SoundService } from './services/sound.service';
import { AdaptiveMusicService, GameMode as MusicGameMode } from './services/adaptive-music.service';
import { MusicSettingsComponent } from './components/music-settings/music-settings.component';
import { SkillLevel } from './models/game.types';

type GameMode = 'menu' | 'single-player' | 'multiplayer' | 'leaderboard' | 'login';

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
    GameRoomComponent,
    LeaderboardComponent,
    LoginComponent,
    LanguageSelectorComponent,
    MusicToggleComponent,
    MusicSettingsComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private gameEngine = inject(GameEngineService);
  protected gameState = inject(GameStateService);
  protected ws = inject(WebSocketService);
  protected auth = inject(AuthService);
  protected i18n = inject(I18nService);
  protected sound = inject(SoundService);
  protected adaptiveMusic = inject(AdaptiveMusicService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(BoardComponent) boardComponent!: BoardComponent;

  // Game mode: menu, single-player, or multiplayer
  gameMode = signal<GameMode>('menu');

  showAboutDialog = signal(false);
  showMusicSettings = signal(false);
  isMobile = signal(window.innerWidth < 640);

  // Computed state for multiplayer
  readonly isInRoom = computed(() => this.ws.isInRoom());
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly currentUser = computed(() => this.auth.user());

  ngOnInit(): void {
    // Initialize Google Sign-In
    this.auth.initializeGoogleSignIn();

    // Link SoundService to AdaptiveMusicService for integrated audio
    this.sound.setAdaptiveMusicService(this.adaptiveMusic);

    // Start adaptive music (will only play if user preference is enabled)
    this.adaptiveMusic.startMusic();

    // Don't auto-connect to WebSocket server on startup
    // WebSocket connection happens when user enters multiplayer mode
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 640);
  }

  // Mode switching
  startSinglePlayer(): void {
    this.gameMode.set('single-player');
    // Set music to solo mode for full adaptive feedback
    this.adaptiveMusic.setGameMode(MusicGameMode.Solo);
    this.gameEngine.newGame();
  }

  startMultiplayer(): void {
    // Require authentication for multiplayer
    if (!this.isAuthenticated()) {
      this.gameMode.set('login');
      this.snackBar.open(this.i18n.t('auth.signInRequired'), 'OK', {
        duration: 3000
      });
      return;
    }

    // Set music to multiplayer mode for subtle adaptation
    this.adaptiveMusic.setGameMode(MusicGameMode.Multiplayer);

    // Reconnect with auth token
    const token = this.auth.getToken();
    if (token) {
      this.ws.connect(token);
    }
    this.gameMode.set('multiplayer');
  }

  /**
   * Start competitive/tournament mode
   * Music adaptation is disabled for fairness
   */
  startCompetitive(): void {
    // Require authentication for competitive play
    if (!this.isAuthenticated()) {
      this.gameMode.set('login');
      this.snackBar.open(this.i18n.t('auth.signInRequired'), 'OK', {
        duration: 3000
      });
      return;
    }

    // Set music to competitive mode (neutral only, no adaptation)
    this.adaptiveMusic.setGameMode(MusicGameMode.Competitive);

    // Reconnect with auth token
    const token = this.auth.getToken();
    if (token) {
      this.ws.connect(token);
    }
    this.gameMode.set('multiplayer');
  }

  showLeaderboard(): void {
    this.gameMode.set('leaderboard');
  }

  showLogin(): void {
    this.gameMode.set('login');
  }

  onLoginSuccess(): void {
    // Reconnect WebSocket with auth token
    const token = this.auth.getToken();
    if (token) {
      this.ws.connect(token);
    }
    this.gameMode.set('menu');
    this.snackBar.open(this.i18n.t('auth.signedIn'), 'OK', {
      duration: 2000
    });
  }

  logout(): void {
    this.auth.signOut();
    this.goToMenu();
    this.snackBar.open(this.i18n.t('auth.signedOut'), 'OK', {
      duration: 2000
    });
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
