/**
 * Music Settings Component
 * Advanced music controls for the pause menu and settings screen
 * 
 * Features:
 * - Music enable/disable toggle
 * - Master volume slider
 * - Individual layer volume controls
 * - Game mode selector (affects music adaptation)
 * - Visual music state indicator
 */

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSliderModule } from '@angular/material/slider';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AdaptiveMusicService, GameMode, MusicLayer } from '../../services/adaptive-music.service';
import { AdvantageCalculatorService, MusicState, GamePhase } from '../../services/advantage-calculator.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-music-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatSliderModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <div class="music-settings">
      <!-- Header -->
      <div class="settings-header">
        <mat-icon class="header-icon">music_note</mat-icon>
        <h3>Music Settings</h3>
      </div>

      <!-- Main Music Toggle -->
      <div class="setting-row">
        <div class="setting-label">
          <mat-icon>{{ music.enabled() ? 'volume_up' : 'volume_off' }}</mat-icon>
          <span>Adaptive Music</span>
        </div>
        <mat-slide-toggle
          [checked]="music.enabled()"
          (change)="music.toggleMusic()"
          color="primary">
        </mat-slide-toggle>
      </div>

      @if (music.enabled()) {
        <!-- Master Volume -->
        <div class="setting-row volume-row">
          <div class="setting-label">
            <mat-icon>tune</mat-icon>
            <span>Master Volume</span>
          </div>
          <div class="volume-control">
            <mat-slider
              [min]="0"
              [max]="100"
              [step]="5"
              [discrete]="true">
              <input matSliderThumb
                     [value]="masterVolume()"
                     (valueChange)="onMasterVolumeChange($event)">
            </mat-slider>
            <span class="volume-value">{{ masterVolume() }}%</span>
          </div>
        </div>

        <mat-divider class="my-4"></mat-divider>

        <!-- Game Mode -->
        <div class="setting-row">
          <div class="setting-label">
            <mat-icon>sports_esports</mat-icon>
            <span>Music Mode</span>
          </div>
          <mat-form-field appearance="outline" class="mode-select">
            <mat-select [value]="music.gameMode()" (selectionChange)="onGameModeChange($event.value)">
              <mat-option [value]="GameMode.Solo">
                <div class="mode-option">
                  <span>🎮 Solo</span>
                  <small>Full adaptive music</small>
                </div>
              </mat-option>
              <mat-option [value]="GameMode.Multiplayer">
                <div class="mode-option">
                  <span>👥 Multiplayer</span>
                  <small>Subtle adaptation</small>
                </div>
              </mat-option>
              <mat-option [value]="GameMode.Competitive">
                <div class="mode-option">
                  <span>🏆 Competitive</span>
                  <small>Neutral only</small>
                </div>
              </mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Music State Indicator -->
        <div class="music-state-indicator">
          <div class="state-label">Current Mood</div>
          <div class="state-display" [class]="'mood-' + advantage.musicState()">
            <span class="mood-icon">{{ getMoodEmoji() }}</span>
            <span class="mood-text">{{ getMoodLabel() }}</span>
          </div>
          <div class="advantage-bar">
            <div class="bar-fill" [style.width.%]="getAdvantagePercent()" 
                 [class]="'fill-' + advantage.musicState()">
            </div>
            <div class="bar-center"></div>
          </div>
          <div class="advantage-labels">
            <span>Losing</span>
            <span>Neutral</span>
            <span>Winning</span>
          </div>
        </div>

        @if (showAdvanced()) {
          <mat-divider class="my-4"></mat-divider>

          <!-- Advanced: Layer Controls -->
          <div class="advanced-section">
            <div class="section-header" (click)="toggleAdvanced()">
              <mat-icon>expand_less</mat-icon>
              <span>Advanced Layer Controls</span>
            </div>
            
            <div class="layer-controls">
              @for (layer of layers; track layer.id) {
                <div class="layer-row">
                  <div class="layer-label">
                    <span class="layer-icon">{{ layer.icon }}</span>
                    <span>{{ layer.name }}</span>
                  </div>
                  <mat-slider [min]="0" [max]="100" [step]="5" class="layer-slider">
                    <input matSliderThumb [value]="layer.volume" (valueChange)="onLayerVolumeChange(layer.id, $event)">
                  </mat-slider>
                </div>
              }
            </div>
          </div>
        } @else {
          <button mat-button class="advanced-toggle" (click)="toggleAdvanced()">
            <mat-icon>expand_more</mat-icon>
            <span>Show Advanced Controls</span>
          </button>
        }
      }

      <!-- Help Text -->
      <div class="help-text">
        <mat-icon>info</mat-icon>
        <p>
          @switch (music.gameMode()) {
            @case (GameMode.Solo) {
              Music adapts to your game state - brighter when winning, 
              gentler when losing, always supportive.
            }
            @case (GameMode.Multiplayer) {
              Subtle musical changes maintain fairness while 
              keeping the game pleasant.
            }
            @case (GameMode.Competitive) {
              Neutral, consistent music ensures no player 
              gets emotional feedback from audio.
            }
          }
        </p>
      </div>
    </div>
  `,
  styles: [`
    .music-settings {
      @apply p-4 rounded-xl;
      @apply bg-slate-800/90 backdrop-blur-lg;
      @apply border border-slate-700/50;
      max-width: 400px;
    }

    .settings-header {
      @apply flex items-center gap-2 mb-4;
      
      .header-icon {
        @apply text-teal-400;
      }
      
      h3 {
        @apply text-lg font-semibold text-white m-0;
      }
    }

    .setting-row {
      @apply flex items-center justify-between py-2;
    }

    .setting-label {
      @apply flex items-center gap-2 text-slate-300;
      
      mat-icon {
        @apply text-slate-400;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
    }

    .volume-row {
      @apply flex-col items-stretch gap-2;
      
      .setting-label {
        @apply mb-1;
      }
    }

    .volume-control {
      @apply flex items-center gap-3;
      
      mat-slider {
        @apply flex-1;
      }
      
      .volume-value {
        @apply text-sm text-slate-400 w-12 text-right;
      }
    }

    .mode-select {
      width: 180px;
      
      ::ng-deep .mat-mdc-select-value {
        @apply text-white;
      }
    }

    .mode-option {
      @apply flex flex-col;
      
      small {
        @apply text-xs text-slate-400;
      }
    }

    .music-state-indicator {
      @apply mt-4 p-3 rounded-lg bg-slate-900/50;
      
      .state-label {
        @apply text-xs text-slate-500 uppercase tracking-wide mb-2;
      }
      
      .state-display {
        @apply flex items-center gap-2 mb-3;
        
        .mood-icon {
          @apply text-2xl;
        }
        
        .mood-text {
          @apply text-lg font-medium;
        }
        
        &.mood-winning {
          @apply text-emerald-400;
        }
        
        &.mood-neutral {
          @apply text-slate-300;
        }
        
        &.mood-losing {
          @apply text-amber-400;
        }
      }
      
      .advantage-bar {
        @apply relative h-2 rounded-full bg-slate-700 overflow-hidden;
        
        .bar-fill {
          @apply absolute left-1/2 h-full transition-all duration-500;
          transform: translateX(-50%);
          
          &.fill-winning {
            @apply bg-gradient-to-r from-transparent to-emerald-500;
            transform: translateX(0);
            left: 50%;
          }
          
          &.fill-neutral {
            @apply bg-slate-500;
          }
          
          &.fill-losing {
            @apply bg-gradient-to-l from-transparent to-amber-500;
            transform: translateX(-100%);
            left: 50%;
          }
        }
        
        .bar-center {
          @apply absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-500;
          transform: translateX(-50%);
        }
      }
      
      .advantage-labels {
        @apply flex justify-between text-xs text-slate-500 mt-1;
      }
    }

    .advanced-section {
      .section-header {
        @apply flex items-center gap-2 text-slate-400 cursor-pointer mb-2;
        @apply hover:text-slate-300 transition-colors;
        
        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .layer-controls {
      @apply space-y-2;
    }

    .layer-row {
      @apply flex items-center gap-3;
      
      .layer-label {
        @apply flex items-center gap-2 w-24;
        
        .layer-icon {
          @apply text-lg;
        }
      }
      
      .layer-slider {
        @apply flex-1;
      }
    }

    .advanced-toggle {
      @apply w-full mt-2 text-slate-400;
      
      mat-icon {
        font-size: 18px;
      }
    }

    .help-text {
      @apply flex gap-2 mt-4 p-3 rounded-lg bg-slate-900/30;
      @apply text-xs text-slate-400;
      
      mat-icon {
        @apply text-slate-500 flex-shrink-0;
        font-size: 16px;
        width: 16px;
        height: 16px;
      }
      
      p {
        @apply m-0 leading-relaxed;
      }
    }

    ::ng-deep {
      .mat-mdc-slider {
        --mdc-slider-active-track-color: theme('colors.teal.500');
        --mdc-slider-inactive-track-color: theme('colors.slate.600');
        --mdc-slider-handle-color: theme('colors.teal.400');
      }
      
      .mat-mdc-slide-toggle.mat-primary {
        --mdc-switch-selected-track-color: theme('colors.teal.600');
        --mdc-switch-selected-handle-color: theme('colors.teal.400');
      }
    }
  `]
})
export class MusicSettingsComponent {
  protected music = inject(AdaptiveMusicService);
  protected advantage = inject(AdvantageCalculatorService);
  protected i18n = inject(I18nService);

  // Expose enums to template
  protected readonly GameMode = GameMode;
  protected readonly MusicState = MusicState;

  // UI state
  protected showAdvanced = signal(false);
  protected masterVolume = signal(15); // 0-100

  // Layer configurations for UI
  protected layers = [
    { id: MusicLayer.Bass, name: 'Bass', icon: '🎸', volume: 80 },
    { id: MusicLayer.Harmony, name: 'Harmony', icon: '🎹', volume: 60 },
    { id: MusicLayer.Melody, name: 'Melody', icon: '🎵', volume: 70 },
    { id: MusicLayer.Rhythm, name: 'Rhythm', icon: '🥁', volume: 40 },
    { id: MusicLayer.Accent, name: 'Accents', icon: '✨', volume: 30 }
  ];

  constructor() {
    // Initialize from service
    this.masterVolume.set(Math.round(this.music.masterVolume() * 100));
  }

  onMasterVolumeChange(value: number): void {
    this.masterVolume.set(value);
    this.music.setMasterVolume(value / 100);
  }

  onGameModeChange(mode: GameMode): void {
    this.music.setGameMode(mode);
  }

  onLayerVolumeChange(layerId: MusicLayer, value: number): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      layer.volume = value;
    }
    // Note: Would need to extend AdaptiveMusicService to support individual layer volumes
  }

  toggleAdvanced(): void {
    this.showAdvanced.update(v => !v);
  }

  getMoodEmoji(): string {
    switch (this.advantage.musicState()) {
      case MusicState.Winning: return '😊';
      case MusicState.Losing: return '🤔';
      default: return '😐';
    }
  }

  getMoodLabel(): string {
    switch (this.advantage.musicState()) {
      case MusicState.Winning: return 'Winning';
      case MusicState.Losing: return 'Losing';
      default: return 'Neutral';
    }
  }

  getAdvantagePercent(): number {
    // Convert from [-1, 1] to [0, 100]
    const score = this.advantage.advantageScore();
    return Math.abs(score) * 50;
  }
}
