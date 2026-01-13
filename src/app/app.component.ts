/**
 * App Component
 * Modern Reversi Application with Angular Material & Tailwind
 * Features: Responsive design, elegant UI, full accessibility
 */

import { Component, inject, signal, ViewChild, HostListener } from '@angular/core';
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
import { GameEngineService } from './services/game-engine.service';
import { GameStateService } from './services/game-state.service';
import { SkillLevel } from './models/game.types';

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
        AboutDialogComponent
    ],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  private gameEngine = inject(GameEngineService);
  protected gameState = inject(GameStateService);
  private snackBar = inject(MatSnackBar);

  @ViewChild(BoardComponent) boardComponent!: BoardComponent;

  showAboutDialog = signal(false);
  isMobile = signal(window.innerWidth < 640);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth < 640);
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
