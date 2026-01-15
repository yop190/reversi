/**
 * Authentication Service
 * Handles Google OAuth 2.0 authentication for the frontend
 */

import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const STORAGE_KEY = 'reversi-auth';
const GOOGLE_CLIENT_ID = ''; // Will be injected at runtime

// Declare Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
          revoke: (email: string, callback: () => void) => void;
        };
      };
    };
  }
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private ngZone = inject(NgZone);
  private googleClientId: string | null = null;
  private isGoogleLoaded = false;

  private _state = signal<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: true,
    error: null,
  });

  readonly state = this._state.asReadonly();
  readonly isAuthenticated = computed(() => this._state().isAuthenticated);
  readonly user = computed(() => this._state().user);
  readonly token = computed(() => this._state().token);
  readonly isLoading = computed(() => this._state().isLoading);
  readonly error = computed(() => this._state().error);

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize authentication state
   */
  private async initializeAuth() {
    // Try to restore session from storage
    const stored = this.getStoredAuth();
    if (stored) {
      // Verify token is still valid
      const isValid = await this.verifyToken(stored.token);
      if (isValid) {
        this._state.set({
          isAuthenticated: true,
          user: stored.user,
          token: stored.token,
          isLoading: false,
          error: null,
        });
        return;
      }
    }

    // No valid session
    this._state.update(s => ({ ...s, isLoading: false }));

    // Load Google Identity Services
    await this.loadGoogleScript();
  }

  /**
   * Load Google Identity Services script
   */
  private loadGoogleScript(): Promise<void> {
    return new Promise((resolve) => {
      if (this.isGoogleLoaded || window.google?.accounts) {
        this.isGoogleLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        this.isGoogleLoaded = true;
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load Google Identity Services');
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Sign-In button
   */
  initializeGoogleButton(buttonElement: HTMLElement): void {
    if (!window.google?.accounts?.id) {
      console.warn('Google Identity Services not loaded');
      return;
    }

    // Get client ID from environment or runtime config
    const clientId = this.getGoogleClientId();
    if (!clientId) {
      console.error('Google Client ID not configured');
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: any) => this.handleGoogleCallback(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(buttonElement, {
      theme: 'filled_blue',
      size: 'large',
      type: 'standard',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 280,
    });
  }

  /**
   * Get Google Client ID from various sources
   */
  private getGoogleClientId(): string | null {
    // Try environment variable (injected at build time)
    if ((environment as any).googleClientId) {
      return (environment as any).googleClientId;
    }

    // Try meta tag (injected at runtime)
    const metaTag = document.querySelector('meta[name="google-client-id"]');
    if (metaTag) {
      return metaTag.getAttribute('content');
    }

    // Try window config (injected by server)
    if ((window as any).__REVERSI_CONFIG__?.googleClientId) {
      return (window as any).__REVERSI_CONFIG__.googleClientId;
    }

    return this.googleClientId;
  }

  /**
   * Set Google Client ID (for runtime configuration)
   */
  setGoogleClientId(clientId: string): void {
    this.googleClientId = clientId;
  }

  /**
   * Handle Google Sign-In callback
   */
  private async handleGoogleCallback(response: any) {
    this.ngZone.run(async () => {
      try {
        this._state.update(s => ({ ...s, isLoading: true, error: null }));

        const idToken = response.credential;
        if (!idToken) {
          throw new Error('No credential received');
        }

        // Send token to backend for validation
        const result = await this.validateTokenWithBackend(idToken);

        if (result) {
          this._state.set({
            isAuthenticated: true,
            user: result.user,
            token: result.accessToken,
            isLoading: false,
            error: null,
          });

          // Store session
          this.storeAuth(result.accessToken, result.user);
        } else {
          throw new Error('Token validation failed');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        this._state.update(s => ({
          ...s,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
        }));
      }
    });
  }

  /**
   * Validate Google ID token with backend
   */
  private async validateTokenWithBackend(idToken: string): Promise<{ accessToken: string; user: AuthUser } | null> {
    try {
      const response = await fetch(`${environment.backendUrl}/auth/google/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        throw new Error('Backend validation failed');
      }

      const data = await response.json();
      return {
        accessToken: data.accessToken,
        user: data.user,
      };
    } catch (error) {
      console.error('Backend validation error:', error);
      return null;
    }
  }

  /**
   * Verify stored token is still valid
   */
  private async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${environment.backendUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sign out
   */
  signOut(): void {
    const user = this._state().user;
    
    // Revoke Google session
    if (user?.email && window.google?.accounts?.id) {
      window.google.accounts.id.revoke(user.email, () => {
        console.log('Google session revoked');
      });
    }

    // Clear state
    this._state.set({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null,
    });

    // Clear storage
    this.clearStoredAuth();
  }

  /**
   * Store authentication data
   */
  private storeAuth(token: string, user: AuthUser): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get stored authentication data
   */
  private getStoredAuth(): { token: string; user: AuthUser } | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // localStorage not available or invalid data
    }
    return null;
  }

  /**
   * Clear stored authentication data
   */
  private clearStoredAuth(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  }

  /**
   * Handle OAuth callback from URL (for redirect flow)
   */
  handleOAuthCallback(token: string): void {
    this._state.update(s => ({ ...s, isLoading: true }));

    // Verify and store token
    this.verifyToken(token).then(async (isValid) => {
      if (isValid) {
        // Fetch user info
        try {
          const response = await fetch(`${environment.backendUrl}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (response.ok) {
            const user = await response.json();
            this._state.set({
              isAuthenticated: true,
              user,
              token,
              isLoading: false,
              error: null,
            });
            this.storeAuth(token, user);
          } else {
            throw new Error('Failed to fetch user info');
          }
        } catch (error) {
          this._state.update(s => ({
            ...s,
            isLoading: false,
            error: 'Failed to complete authentication',
          }));
        }
      } else {
        this._state.update(s => ({
          ...s,
          isLoading: false,
          error: 'Invalid token',
        }));
      }
    });
  }

  /**
   * Initialize Google Sign-In (for explicit initialization if needed)
   * Note: This is called automatically in constructor, but can be called again
   */
  initializeGoogleSignIn(): void {
    this.loadGoogleScript().then(() => {
      console.log('Google Sign-In initialized');
    });
  }

  /**
   * Get the current authentication token
   */
  getToken(): string | null {
    return this._state().token;
  }
}
