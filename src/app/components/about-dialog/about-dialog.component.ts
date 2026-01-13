/**
 * About Dialog Component
 * Modern modal dialog with glass morphism effect
 * Shows game information and credits
 */

import { Component, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'app-about-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatIconModule],
    template: `
    <div class="dialog-overlay" 
         (click)="close.emit()"
         role="dialog"
         aria-modal="true"
         aria-labelledby="about-title">
      <div class="dialog-window animate-in" (click)="$event.stopPropagation()">
        <!-- Close button -->
        <button mat-icon-button 
                class="close-btn"
                (click)="close.emit()"
                aria-label="Close dialog">
          <mat-icon>close</mat-icon>
        </button>

        <!-- Logo / Icon -->
        <div class="logo-section">
          <div class="logo-container">
            <div class="logo-grid">
              <div class="logo-piece black"></div>
              <div class="logo-piece white"></div>
              <div class="logo-piece white"></div>
              <div class="logo-piece black"></div>
            </div>
            <div class="logo-glow"></div>
          </div>
        </div>

        <!-- Content -->
        <div class="content-section">
          <h2 id="about-title" class="app-title">Reversi</h2>
          <p class="app-subtitle">Modern Strategy Game</p>
          
          <div class="version-badge">
            <span class="material-symbols-outlined">new_releases</span>
            Version 2.0
          </div>

          <div class="divider"></div>

          <div class="info-grid">
            <div class="info-item">
              <span class="material-symbols-outlined">code</span>
              <div>
                <span class="info-label">Built with</span>
                <span class="info-value">Angular 19</span>
              </div>
            </div>
            <div class="info-item">
              <span class="material-symbols-outlined">palette</span>
              <div>
                <span class="info-label">Design</span>
                <span class="info-value">Material 3</span>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <p class="credits">
            Inspired by the classic Windows Reversi (1985).<br>
            Modernized with ❤️ using Angular & Tailwind.
          </p>

          <div class="features-list">
            <span class="feature-tag">🎮 AI Opponent</span>
            <span class="feature-tag">📱 Responsive</span>
            <span class="feature-tag">♿ Accessible</span>
            <span class="feature-tag">🎨 Modern UI</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer-section">
          <button mat-flat-button 
                  color="primary"
                  (click)="close.emit()"
                  class="play-btn">
            <mat-icon>play_arrow</mat-icon>
            Let's Play!
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }
    
    .dialog-window {
      background: linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1.5rem;
      box-shadow: 
        0 25px 50px rgba(0, 0, 0, 0.5),
        0 0 0 1px rgba(255, 255, 255, 0.05);
      max-width: 400px;
      width: 100%;
      position: relative;
      overflow: hidden;
    }

    .animate-in {
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .close-btn {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
      z-index: 10;
      color: rgba(255, 255, 255, 0.5) !important;
    }

    .close-btn:hover {
      color: white !important;
      background: rgba(255, 255, 255, 0.1) !important;
    }

    .logo-section {
      display: flex;
      justify-content: center;
      padding: 2rem 2rem 1rem;
    }

    .logo-container {
      position: relative;
    }

    .logo-grid {
      width: 80px;
      height: 80px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 4px;
      padding: 8px;
      background: linear-gradient(135deg, #059669, #047857);
      border-radius: 1rem;
      box-shadow: 
        inset 0 2px 4px rgba(255, 255, 255, 0.1),
        0 8px 24px rgba(5, 150, 105, 0.4);
    }

    .logo-piece {
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .logo-piece.black {
      background: linear-gradient(145deg, #374151, #1f2937);
    }

    .logo-piece.white {
      background: linear-gradient(145deg, #ffffff, #e5e7eb);
    }

    .logo-glow {
      position: absolute;
      inset: -20px;
      background: radial-gradient(circle, rgba(20, 184, 166, 0.3), transparent 70%);
      z-index: -1;
    }

    .content-section {
      padding: 0 2rem 1.5rem;
      text-align: center;
    }

    .app-title {
      font-size: 2rem;
      font-weight: 700;
      color: white;
      margin: 0;
      letter-spacing: -0.02em;
    }

    .app-subtitle {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.6);
      margin: 0.25rem 0 1rem;
    }

    .version-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(20, 184, 166, 0.15);
      border: 1px solid rgba(20, 184, 166, 0.3);
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      color: rgb(45, 212, 191);
    }

    .version-badge .material-symbols-outlined {
      font-size: 1rem;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.1), transparent);
      margin: 1.25rem 0;
    }

    .info-grid {
      display: flex;
      justify-content: center;
      gap: 2rem;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .info-item .material-symbols-outlined {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.5);
    }

    .info-item div {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .info-label {
      font-size: 0.625rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255, 255, 255, 0.4);
    }

    .info-value {
      font-size: 0.875rem;
      font-weight: 500;
    }

    .credits {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.5);
      line-height: 1.6;
      margin: 0;
    }

    .features-list {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }

    .feature-tag {
      font-size: 0.625rem;
      padding: 0.25rem 0.5rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: rgba(255, 255, 255, 0.6);
    }

    .footer-section {
      padding: 1.5rem 2rem;
      background: rgba(0, 0, 0, 0.2);
      display: flex;
      justify-content: center;
    }

    .play-btn {
      background: linear-gradient(135deg, #14b8a6, #0d9488) !important;
      border-radius: 9999px !important;
      padding: 0 2rem !important;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to { 
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
  `]
})
export class AboutDialogComponent {
  @Output() close = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }
}
