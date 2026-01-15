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
              
              <!-- Google Sign-In Button Container -->
              <div #googleButton class="google-button-container"></div>

              <!-- Fallback button if Google SDK doesn't load -->
              @if (showFallback()) {
                <button mat-raised-button color="primary" class="fallback-button" (click)="signInWithRedirect()">
                  <img src="https://www.google.com/favicon.ico" alt="Google" class="google-icon">
                  {{ i18n.translate('signInWithGoogle') }}
                </button>
              }
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
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    }

    .login-card {
      max-width: 400px;
      width: 100%;
      text-align: center;
      position: relative;
    }

    .header-top {
      position: absolute;
      top: 8px;
      left: 8px;
    }

    .back-button {
      color: #666;
    }

    .app-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #3f51b5;
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
    }

    .sign-in-message {
      color: #666;
      margin-bottom: 1rem;
    }

    .google-button-container {
      min-height: 44px;
      display: flex;
      justify-content: center;
    }

    .fallback-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.5rem;
    }

    .google-icon {
      width: 20px;
      height: 20px;
    }

    .login-actions {
      display: flex;
      justify-content: center;
      padding: 1rem;
      border-top: 1px solid #eee;
    }

    .language-selector {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .language-selector button {
      min-width: auto;
      padding: 0.25rem 0.5rem;
      font-size: 1.25rem;
    }

    .language-selector button.active {
      background: rgba(63, 81, 181, 0.1);
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
    // Initialize Google button after view is ready
    setTimeout(() => {
      if (this.googleButtonRef?.nativeElement) {
        this.auth.initializeGoogleButton(this.googleButtonRef.nativeElement);
        
        // Show fallback if Google button doesn't render
        setTimeout(() => {
          if (!this.googleButtonRef.nativeElement.querySelector('iframe')) {
            this.showFallback.set(true);
          }
        }, 2000);
      }
      
      // Listen for auth state changes
      this.checkAuthState();
    }, 500);
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
