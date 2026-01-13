/**
 * Menu Component
 * Windows 2.0 style menu bar
 * Exact replication of original REVERSI.EXE menu structure
 */

import { Component, inject, Output, EventEmitter, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameStateService } from '../../services/game-state.service';
import { SkillLevel } from '../../models/game.types';

@Component({
    selector: 'app-menu',
    imports: [CommonModule],
    template: `
    <div class="menu-bar">
      <!-- Game Menu -->
      <div class="menu-item" 
           [class.active]="activeMenu() === 'game'"
           (click)="toggleMenu('game')">
        <span class="menu-label"><u>G</u>ame</span>
        @if (activeMenu() === 'game') {
          <div class="dropdown">
            <div class="menu-option" (click)="onHint()">
              <span><u>H</u>int</span>
            </div>
            <div class="menu-option" (click)="onPass()">
              <span><u>P</u>ass</span>
            </div>
            <div class="menu-separator"></div>
            <div class="menu-option" (click)="onNew()">
              <span><u>N</u>ew</span>
            </div>
            <div class="menu-separator"></div>
            <div class="menu-option" (click)="onExit()">
              <span>E<u>x</u>it</span>
            </div>
            <div class="menu-separator"></div>
            <div class="menu-option" (click)="onAbout()">
              <span>A<u>b</u>out Reversi...</span>
            </div>
          </div>
        }
      </div>
      
      <!-- Skill Menu -->
      <div class="menu-item"
           [class.active]="activeMenu() === 'skill'"
           (click)="toggleMenu('skill')">
        <span class="menu-label"><u>S</u>kill</span>
        @if (activeMenu() === 'skill') {
          <div class="dropdown">
            <div class="menu-option" 
                 [class.checked]="gameState.skillLevel() === SkillLevel.Beginner"
                 (click)="onSkillSelect(SkillLevel.Beginner)">
              <span class="check-mark">{{ gameState.skillLevel() === SkillLevel.Beginner ? '✓' : '' }}</span>
              <span><u>B</u>eginner</span>
            </div>
            <div class="menu-option"
                 [class.checked]="gameState.skillLevel() === SkillLevel.Novice"
                 (click)="onSkillSelect(SkillLevel.Novice)">
              <span class="check-mark">{{ gameState.skillLevel() === SkillLevel.Novice ? '✓' : '' }}</span>
              <span><u>N</u>ovice</span>
            </div>
            <div class="menu-option"
                 [class.checked]="gameState.skillLevel() === SkillLevel.Expert"
                 (click)="onSkillSelect(SkillLevel.Expert)">
              <span class="check-mark">{{ gameState.skillLevel() === SkillLevel.Expert ? '✓' : '' }}</span>
              <span><u>E</u>xpert</span>
            </div>
            <div class="menu-option"
                 [class.checked]="gameState.skillLevel() === SkillLevel.Master"
                 (click)="onSkillSelect(SkillLevel.Master)">
              <span class="check-mark">{{ gameState.skillLevel() === SkillLevel.Master ? '✓' : '' }}</span>
              <span><u>M</u>aster</span>
            </div>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .menu-bar {
      display: flex;
      background-color: #c0c0c0;
      border-bottom: 1px solid #808080;
      font-family: 'MS Sans Serif', 'Segoe UI', Tahoma, sans-serif;
      font-size: 12px;
      user-select: none;
    }
    
    .menu-item {
      position: relative;
      padding: 2px 8px;
      cursor: default;
    }
    
    .menu-item:hover {
      background-color: #000080;
      color: #ffffff;
    }
    
    .menu-item.active {
      background-color: #000080;
      color: #ffffff;
    }
    
    .menu-label u {
      text-decoration: underline;
    }
    
    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 160px;
      background-color: #c0c0c0;
      border: 2px outset #c0c0c0;
      box-shadow: 2px 2px 0 #000000;
      z-index: 1000;
    }
    
    .menu-option {
      display: flex;
      align-items: center;
      padding: 4px 24px 4px 8px;
      color: #000000;
      cursor: default;
    }
    
    .menu-option:hover {
      background-color: #000080;
      color: #ffffff;
    }
    
    .menu-option u {
      text-decoration: underline;
    }
    
    .menu-separator {
      height: 1px;
      margin: 2px 4px;
      background-color: #808080;
      border-bottom: 1px solid #ffffff;
    }
    
    .check-mark {
      width: 16px;
      margin-right: 4px;
      font-family: monospace;
    }
    
    .menu-option.checked {
      font-weight: normal;
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

  activeMenu = signal<string | null>(null);

  toggleMenu(menu: string): void {
    if (this.activeMenu() === menu) {
      this.activeMenu.set(null);
    } else {
      this.activeMenu.set(menu);
    }
  }

  closeMenu(): void {
    this.activeMenu.set(null);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('app-menu')) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    // Handle Alt+key shortcuts
    if (event.altKey) {
      switch (event.key.toLowerCase()) {
        case 'g':
          event.preventDefault();
          this.toggleMenu('game');
          break;
        case 's':
          event.preventDefault();
          this.toggleMenu('skill');
          break;
        case 'h':
          event.preventDefault();
          this.onHint();
          break;
        case 'p':
          event.preventDefault();
          this.onPass();
          break;
        case 'n':
          event.preventDefault();
          this.onNew();
          break;
        case 'x':
          event.preventDefault();
          this.onExit();
          break;
        case 'b':
          if (this.activeMenu() === 'skill') {
            event.preventDefault();
            this.onSkillSelect(SkillLevel.Beginner);
          } else if (this.activeMenu() === 'game') {
            event.preventDefault();
            this.onAbout();
          }
          break;
        case 'e':
          if (this.activeMenu() === 'skill') {
            event.preventDefault();
            this.onSkillSelect(SkillLevel.Expert);
          }
          break;
        case 'm':
          if (this.activeMenu() === 'skill') {
            event.preventDefault();
            this.onSkillSelect(SkillLevel.Master);
          }
          break;
      }
    }

    // Escape closes menu
    if (event.key === 'Escape') {
      this.closeMenu();
    }
  }

  onHint(): void {
    this.closeMenu();
    this.hint.emit();
  }

  onPass(): void {
    this.closeMenu();
    this.pass.emit();
  }

  onNew(): void {
    this.closeMenu();
    this.newGame.emit();
  }

  onExit(): void {
    this.closeMenu();
    this.exit.emit();
  }

  onAbout(): void {
    this.closeMenu();
    this.about.emit();
  }

  onSkillSelect(level: SkillLevel): void {
    this.closeMenu();
    this.skillChange.emit(level);
  }
}
