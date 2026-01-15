/**
 * Authentication Service
 * Handles user authentication, token generation, and validation
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface GoogleUser {
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface AuthenticatedUser {
  id: string;
  googleId: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export interface JwtPayload {
  sub: string; // User ID
  googleId: string;
  email: string;
  displayName: string;
}

export interface TokenResponse {
  accessToken: string;
  user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  // In-memory user store (for stateless operation)
  // In production, this should sync with Firestore
  private users = new Map<string, AuthenticatedUser>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Validate or create user from Google OAuth profile
   */
  async validateGoogleUser(googleUser: GoogleUser): Promise<AuthenticatedUser> {
    // Check if user exists by Google ID
    const existingUser = Array.from(this.users.values()).find(
      (u) => u.googleId === googleUser.googleId
    );

    if (existingUser) {
      // Update user info
      existingUser.email = googleUser.email;
      existingUser.displayName = googleUser.displayName;
      existingUser.photoUrl = googleUser.photoUrl;
      return existingUser;
    }

    // Create new user
    const newUser: AuthenticatedUser = {
      id: `user_${googleUser.googleId}`,
      googleId: googleUser.googleId,
      email: googleUser.email,
      displayName: googleUser.displayName,
      photoUrl: googleUser.photoUrl,
    };

    this.users.set(newUser.id, newUser);
    return newUser;
  }

  /**
   * Generate JWT token for authenticated user
   */
  async generateToken(user: AuthenticatedUser): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user,
    };
  }

  /**
   * Verify JWT token and return user
   */
  async verifyToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      return this.getUserById(payload.sub);
    } catch {
      return null;
    }
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): AuthenticatedUser | null {
    return this.users.get(userId) || null;
  }

  /**
   * Get user by Google ID
   */
  getUserByGoogleId(googleId: string): AuthenticatedUser | null {
    return Array.from(this.users.values()).find(
      (u) => u.googleId === googleId
    ) || null;
  }

  /**
   * Validate Google ID token (for client-side OAuth)
   */
  async validateGoogleIdToken(idToken: string): Promise<GoogleUser | null> {
    try {
      const { OAuth2Client } = await import('google-auth-library');
      const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      
      if (!clientId) {
        console.warn('GOOGLE_CLIENT_ID not configured');
        return null;
      }

      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        return null;
      }

      return {
        googleId: payload.sub,
        email: payload.email || '',
        displayName: payload.name || payload.email || 'Unknown',
        photoUrl: payload.picture,
      };
    } catch (error) {
      console.error('Google token validation failed:', error);
      return null;
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(googleUser: GoogleUser): Promise<TokenResponse> {
    const user = await this.validateGoogleUser(googleUser);
    return this.generateToken(user);
  }
}
