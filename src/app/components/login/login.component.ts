/**
 * Login Component
 * Handles Google OAuth sign-in
 */

import { Component, inject, AfterViewInit, ViewChild, ElementRef, signal, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="header-top">
            <button mat-icon-button class="back-button" (click)="onBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
          </div>
          <mat-icon mat-card-avatar class="app-icon">grid_on</mat-icon>
          <mat-card-title>{{ i18n.translate('appTitle') }}</mat-card-title>
          <mat-card-subtitle>{{ i18n.translate('appSubtitle') }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content class="login-content">
          @if (auth.isLoading()) {
            <div class="loading-state">
              <mat-spinner diameter="40"></mat-spinner>
              <p>{{ i18n.translate('loading') }}</p>
            </div>
          } @else if (auth.error()) {
            <div class="error-state">
              <mat-icon color="warn">error_outline</mat-icon>
              <p>{{ auth.error() }}</p>
              <button mat-button color="primary" (click)="retry()">
                {{ i18n.translate('tryAgain') }}
              </button>
            </div>
          } @else {
            <div class="sign-in-section">
              <p class="sign-in-message">{{ i18n.translate('signInRequired') }}</p>
              
              <!-- Custom Google Sign-In Button - renders immediately -->
              <button class="google-signin-button" (click)="signInWithRedirect()">
                <svg class="google-logo" viewBox="0 0 24 24" width="20" height="20">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span class="google-button-text">{{ i18n.translate('signInWithGoogle') }}</span>
              </button>
              
              <!-- Hidden Google SDK button for popup flow (optional) -->
              <div #googleButton class="google-sdk-container"></div>
            </div>
          }
        </mat-card-content>

        <mat-card-actions class="login-actions">
          <!-- Language Selector -->
          <div class="language-selector">
            <mat-icon>language</mat-icon>
            @for (locale of i18n.supportedLocales; track locale.code) {
              <button 
                mat-button 
                [class.active]="locale.code === i18n.currentLocale()"
                (click)="i18n.setLocale(locale.code)">
                {{ locale.flag }}
              </button>
            }
          </div>
        </mat-card-actions>
      </mat-card>

      <!-- Features Preview -->
      <div class="features-preview">
        <div class="feature">
          <mat-icon>sports_esports</mat-icon>
          <span>{{ i18n.translate('singlePlayer') }}</span>
        </div>
        <div class="feature">
          <mat-icon>groups</mat-icon>
          <span>{{ i18n.translate('multiplayer') }}</span>
        </div>
        <div class="feature">
          <mat-icon>leaderboard</mat-icon>
          <span>{{ i18n.translate('leaderboard') }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e293b 100%);
    }

    .login-card {
      max-width: 400px;
      width: 100%;
      text-align: center;
      position: relative;
      background: linear-gradient(135deg,
        rgba(255, 255, 255, 0.1) 0%,
        rgba(255, 255, 255, 0.05) 100%) !important;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      color: white;
    }

    .login-card mat-card-title,
    .login-card mat-card-subtitle {
      color: white !important;
    }

    .login-card mat-card-subtitle {
      opacity: 0.7;
    }

    .header-top {
      position: absolute;
      top: 8px;
      left: 8px;
    }

    .back-button {
      color: rgba(255, 255, 255, 0.7);
    }

    .app-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #14b8a6;
    }

    .login-content {
      padding: 2rem;
    }

    .loading-state,
    .error-state,
    .sign-in-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .error-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #f87171;
    }

    .sign-in-message {
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 1rem;
    }

    .google-signin-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 12px 24px;
      background: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: 'Roboto', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #3c4043;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      transition: box-shadow 0.2s, background 0.2s;
      min-width: 240px;
    }

    .google-signin-button:hover {
      background: #f8f9fa;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
    }

    .google-signin-button:active {
      background: #f1f3f4;
    }

    .google-logo {
      flex-shrink: 0;
    }

    .google-button-text {
      white-space: nowrap;
    }

    .google-sdk-container {
      display: none;
    }

    .fallback-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.5rem;
      background: white !important;
      color: #1e293b !important;
    }

    .google-icon {
      width: 20px;
      height: 20px;
    }

    .login-actions {
      display: flex;
      justify-content: center;
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .language-selector {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .language-selector button {
      min-width: auto;
      padding: 0.25rem 0.5rem;
      font-size: 1.25rem;
      color: white;
    }

    .language-selector button.active {
      background: rgba(99, 102, 241, 0.2);
    }

    .features-preview {
      display: flex;
      gap: 2rem;
      margin-top: 2rem;
      color: white;
    }

    .feature {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      opacity: 0.8;
    }

    .feature mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    @media (max-width: 600px) {
      .features-preview {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `],
})
export class LoginComponent implements OnInit, AfterViewInit {
  @ViewChild('googleButton') googleButtonRef!: ElementRef;
  @Output() loginSuccess = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  protected auth = inject(AuthService);
  protected i18n = inject(I18nService);

  showFallback = signal(false);

  ngOnInit(): void {
    // Watch for authentication changes
    // When user becomes authenticated, emit success event
  }

  ngAfterViewInit(): void {
    // Listen for auth state changes immediately
    this.checkAuthState();
  }

  private checkAuthState(): void {
    // Poll for authentication (since we can't easily subscribe to the signal)
    const interval = setInterval(() => {
      if (this.auth.isAuthenticated()) {
        clearInterval(interval);
        this.loginSuccess.emit();
      }
    }, 500);
    
    // Clear interval after 5 minutes to prevent memory leak
    setTimeout(() => clearInterval(interval), 300000);
  }

  onBack(): void {
    this.back.emit();
  }

  retry(): void {
    window.location.reload();
  }

  signInWithRedirect(): void {
    // Fallback: redirect to backend OAuth endpoint
    const backendUrl = (window as any).__REVERSI_CONFIG__?.backendUrl || 
                       'https://ca-reversi-backend.graystone-893f55ee.westeurope.azurecontainerapps.io';
    window.location.href = `${backendUrl}/auth/google`;
  }
}
