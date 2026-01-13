/**
 * App Component
 * Main window for Reversi application
 * Replicates the Windows 2.0 Reversi main window
 */

import { Component, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  private gameState = inject(GameStateService);
  
  @ViewChild(BoardComponent) boardComponent!: BoardComponent;
  
  showAboutDialog = signal(false);
  
  onHint(): void {
    const hintPos = this.gameEngine.getHint();
    if (hintPos && this.boardComponent) {
      this.boardComponent.showHint(hintPos);
      // Clear hint after a short delay
      setTimeout(() => {
        this.boardComponent.clearHint();
      }, 2000);
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
  }
  
  onExit(): void {
    // In a browser context, we can close the window or show a message
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
  }
}
