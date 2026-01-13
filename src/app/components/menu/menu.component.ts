/**
 * Menu Component
 * Modern Angular Material toolbar with dropdown menus
 * Preserves all keyboard shortcuts from original
 */

import { Component, inject, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { GameStateService } from '../../services/game-state.service';
import { SkillLevel } from '../../models/game.types';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <nav class="flex items-center gap-1 sm:gap-2" role="navigation" aria-label="Game controls">
      <!-- New Game Button -->
      <button mat-icon-button 
              matTooltip="New Game (N)"
              aria-label="Start new game"
              (click)="onNew()"
              class="!text-slate-300 hover:!text-white hover:!bg-white/10">
        <mat-icon>refresh</mat-icon>
      </button>

      <!-- Game Menu -->
      <button mat-button 
              [matMenuTriggerFor]="gameMenu"
              class="!text-slate-300 hover:!text-white hover:!bg-white/10 !rounded-lg hidden sm:flex">
        <mat-icon class="mr-1">sports_esports</mat-icon>
        Game
        <mat-icon iconPositionEnd>expand_more</mat-icon>
      </button>

      <mat-menu #gameMenu="matMenu" class="modern-menu">
        <button mat-menu-item (click)="onHint()">
          <mat-icon>lightbulb</mat-icon>
          <span>Hint</span>
          <span class="shortcut">H</span>
        </button>
        <button mat-menu-item (click)="onPass()">
          <mat-icon>skip_next</mat-icon>
          <span>Pass</span>
          <span class="shortcut">P</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="onNew()">
          <mat-icon>refresh</mat-icon>
          <span>New Game</span>
          <span class="shortcut">N</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="onAbout()">
          <mat-icon>info</mat-icon>
          <span>About Reversi</span>
        </button>
      </mat-menu>

      <!-- Difficulty Menu -->
      <button mat-button 
              [matMenuTriggerFor]="skillMenu"
              class="!text-slate-300 hover:!text-white hover:!bg-white/10 !rounded-lg">
        <mat-icon class="mr-1">psychology</mat-icon>
        <span class="hidden sm:inline">{{ currentSkillName }}</span>
        <mat-icon iconPositionEnd>expand_more</mat-icon>
      </button>

      <mat-menu #skillMenu="matMenu" class="modern-menu">
        <button mat-menu-item 
                (click)="onSkillSelect(SkillLevel.Beginner)"
                [class.selected]="gameState.skillLevel() === SkillLevel.Beginner">
          <mat-icon>{{ gameState.skillLevel() === SkillLevel.Beginner ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>Beginner</span>
          <span class="difficulty-badge easy">Easy</span>
        </button>
        <button mat-menu-item 
                (click)="onSkillSelect(SkillLevel.Novice)"
                [class.selected]="gameState.skillLevel() === SkillLevel.Novice">
          <mat-icon>{{ gameState.skillLevel() === SkillLevel.Novice ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>Novice</span>
          <span class="difficulty-badge medium">Medium</span>
        </button>
        <button mat-menu-item 
                (click)="onSkillSelect(SkillLevel.Expert)"
                [class.selected]="gameState.skillLevel() === SkillLevel.Expert">
          <mat-icon>{{ gameState.skillLevel() === SkillLevel.Expert ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>Expert</span>
          <span class="difficulty-badge hard">Hard</span>
        </button>
        <button mat-menu-item 
                (click)="onSkillSelect(SkillLevel.Master)"
                [class.selected]="gameState.skillLevel() === SkillLevel.Master">
          <mat-icon>{{ gameState.skillLevel() === SkillLevel.Master ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
          <span>Master</span>
          <span class="difficulty-badge extreme">Extreme</span>
        </button>
      </mat-menu>

      <!-- Mobile Menu (3-dot) -->
      <button mat-icon-button 
              [matMenuTriggerFor]="mobileMenu"
              class="sm:hidden !text-slate-300 hover:!text-white hover:!bg-white/10"
              aria-label="More options">
        <mat-icon>more_vert</mat-icon>
      </button>

      <mat-menu #mobileMenu="matMenu" class="modern-menu">
        <button mat-menu-item (click)="onHint()">
          <mat-icon>lightbulb</mat-icon>
          <span>Hint</span>
        </button>
        <button mat-menu-item (click)="onPass()">
          <mat-icon>skip_next</mat-icon>
          <span>Pass</span>
        </button>
        <mat-divider></mat-divider>
        <button mat-menu-item (click)="onAbout()">
          <mat-icon>info</mat-icon>
          <span>About</span>
        </button>
      </mat-menu>
    </nav>
  `,
  styles: [`
    :host {
      display: block;
    }

    .shortcut {
      margin-left: auto;
      padding-left: 2rem;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      font-family: 'SF Mono', 'Roboto Mono', monospace;
    }

    .difficulty-badge {
      margin-left: auto;
      padding: 0.125rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.625rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .difficulty-badge.easy {
      background-color: rgba(34, 197, 94, 0.2);
      color: rgb(134, 239, 172);
    }

    .difficulty-badge.medium {
      background-color: rgba(234, 179, 8, 0.2);
      color: rgb(253, 224, 71);
    }

    .difficulty-badge.hard {
      background-color: rgba(249, 115, 22, 0.2);
      color: rgb(253, 186, 116);
    }

    .difficulty-badge.extreme {
      background-color: rgba(239, 68, 68, 0.2);
      color: rgb(252, 165, 165);
    }

    ::ng-deep .modern-menu {
      .mat-mdc-menu-panel {
        background: rgba(30, 41, 59, 0.95) !important;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px !important;
      }

      .mat-mdc-menu-item {
        color: rgba(255, 255, 255, 0.9) !important;
        
        &:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .mat-icon {
          color: rgba(255, 255, 255, 0.7);
        }
      }

      .mat-mdc-menu-item.selected {
        background: rgba(20, 184, 166, 0.15) !important;
        
        .mat-icon {
          color: rgb(45, 212, 191);
        }
      }

      .mat-divider {
        border-top-color: rgba(255, 255, 255, 0.1) !important;
      }
    }
  `]
})
export class MenuComponent {
  gameState = inject(GameStateService);

  @Output() hint = new EventEmitter<void>();
  @Output() pass = new EventEmitter<void>();
  @Output() newGame = new EventEmitter<void>();
  @Output() exit = new EventEmitter<void>();
  @Output() about = new EventEmitter<void>();
  @Output() skillChange = new EventEmitter<SkillLevel>();

  readonly SkillLevel = SkillLevel;

  private readonly skillNames: Record<SkillLevel, string> = {
    [SkillLevel.Beginner]: 'Beginner',
    [SkillLevel.Novice]: 'Novice',
    [SkillLevel.Expert]: 'Expert',
    [SkillLevel.Master]: 'Master'
  };

  get currentSkillName(): string {
    return this.skillNames[this.gameState.skillLevel()];
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Handle keyboard shortcuts (without Alt for modern UX)
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'h':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.onHint();
        }
        break;
      case 'p':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.onPass();
        }
        break;
      case 'n':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.onNew();
        }
        break;
      case '1':
        event.preventDefault();
        this.onSkillSelect(SkillLevel.Beginner);
        break;
      case '2':
        event.preventDefault();
        this.onSkillSelect(SkillLevel.Novice);
        break;
      case '3':
        event.preventDefault();
        this.onSkillSelect(SkillLevel.Expert);
        break;
      case '4':
        event.preventDefault();
        this.onSkillSelect(SkillLevel.Master);
        break;
    }
  }

  onHint(): void {
    this.hint.emit();
  }

  onPass(): void {
    this.pass.emit();
  }

  onNew(): void {
    this.newGame.emit();
  }

  onExit(): void {
    this.exit.emit();
  }

  onAbout(): void {
    this.about.emit();
  }

  onSkillSelect(level: SkillLevel): void {
    this.skillChange.emit(level);
  }
}
