/**
 * Music Toggle Component
 * A standalone reusable button for enabling/disabling adaptive music
 * 
 * Features:
 * - Visual indicator of music state (🎵 / 🔇)
 * - Tooltip with current state
 * - Accessible keyboard support
 * - Works across all game screens
 */

import { Component, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdaptiveMusicService } from '../../services/adaptive-music.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-music-toggle',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
    <button 
      [class]="buttonClass"
      (click)="toggleMusic()"
      [attr.aria-label]="ariaLabel"
      [matTooltip]="tooltipText"
      matTooltipPosition="below">
      
      @if (variant === 'icon') {
        <mat-icon [class]="iconClass">
          {{ music.enabled() ? 'music_note' : 'music_off' }}
        </mat-icon>
      } @else if (variant === 'icon-text') {
        <mat-icon>{{ music.enabled() ? 'music_note' : 'music_off' }}</mat-icon>
        <span class="ml-1">{{ music.enabled() ? 'Music On' : 'Music Off' }}</span>
      } @else if (variant === 'emoji') {
        <span class="text-xl">{{ music.enabled() ? '🎵' : '🔇' }}</span>
      } @else {
        <!-- Full button with label -->
        <div class="flex items-center gap-2">
          <span class="text-lg">{{ music.enabled() ? '🎵' : '🔇' }}</span>
          <span>{{ music.enabled() ? 'Music' : 'Muted' }}</span>
        </div>
      }
    </button>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
    
    .music-toggle-icon {
      @apply text-slate-300 hover:text-white hover:bg-white/10 transition-colors;
      min-width: 40px;
      height: 40px;
    }
    
    .music-toggle-icon.active {
      @apply text-teal-400;
    }
    
    .music-toggle-button {
      @apply px-4 py-2 rounded-lg transition-all;
      @apply bg-slate-700/50 hover:bg-slate-600/50;
      @apply text-slate-300 hover:text-white;
      @apply border border-slate-600/50 hover:border-slate-500/50;
    }
    
    .music-toggle-button.active {
      @apply bg-teal-500/20 border-teal-500/50 text-teal-300;
    }
    
    .music-icon-animated {
      transition: transform 0.2s ease;
    }
    
    .music-icon-animated:hover {
      transform: scale(1.1);
    }
  `]
})
export class MusicToggleComponent {
  protected music = inject(AdaptiveMusicService);
  protected i18n = inject(I18nService);

  /**
   * Button variant:
   * - 'icon': Just the icon (for toolbars)
   * - 'icon-text': Icon with text label
   * - 'emoji': Emoji-only button
   * - 'full': Full button with emoji and label
   */
  @Input() variant: 'icon' | 'icon-text' | 'emoji' | 'full' = 'icon';

  /**
   * Size preset
   */
  @Input() size: 'small' | 'medium' | 'large' = 'medium';

  /**
   * Show animated icon
   */
  @Input() animated = true;

  get buttonClass(): string {
    const base = this.variant === 'icon' || this.variant === 'emoji' 
      ? 'music-toggle-icon' 
      : 'music-toggle-button';
    
    const active = this.music.enabled() ? 'active' : '';
    
    return `${base} ${active}`.trim();
  }

  get iconClass(): string {
    return this.animated ? 'music-icon-animated' : '';
  }

  get tooltipText(): string {
    return this.music.enabled() 
      ? 'Click to mute music' 
      : 'Click to enable music';
  }

  get ariaLabel(): string {
    return this.music.enabled() 
      ? 'Mute background music' 
      : 'Enable background music';
  }

  toggleMusic(): void {
    this.music.toggleMusic();
  }
}
