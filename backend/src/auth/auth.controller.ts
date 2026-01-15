/**
 * Authentication Controller
 * Handles Google OAuth 2.0 authentication endpoints
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { AuthService, TokenResponse } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.service';
import { ConfigService } from '@nestjs/config';

interface GoogleTokenDto {
  idToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  /**
   * Initiate Google OAuth flow (redirect to Google)
   */
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Guard will redirect to Google
  }

  /**
   * Google OAuth callback
   */
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as any;
    if (!user) {
      throw new UnauthorizedException('Authentication failed');
    }

    const tokenResponse = await this.authService.handleGoogleCallback({
      googleId: user.googleId,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    });

    // Redirect to frontend with token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://reversi.lebrere.fr';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${tokenResponse.accessToken}`;
    
    res.redirect(redirectUrl);
  }

  /**
   * Validate Google ID token from client-side OAuth
   * This is the primary authentication method for SPAs
   */
  @Post('google/token')
  @HttpCode(HttpStatus.OK)
  async validateGoogleToken(@Body() dto: GoogleTokenDto): Promise<TokenResponse> {
    const { idToken } = dto;

    if (!idToken) {
      throw new UnauthorizedException('ID token is required');
    }

    const googleUser = await this.authService.validateGoogleIdToken(idToken);
    if (!googleUser) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return this.authService.handleGoogleCallback(googleUser);
  }

  /**
   * Get current authenticated user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
    };
  }

  /**
   * Verify token validity
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  verifyToken(@CurrentUser() user: AuthenticatedUser) {
    return {
      valid: true,
      userId: user.id,
      email: user.email,
    };
  }

  /**
   * Logout (client should delete token)
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout() {
    // Stateless JWT - client handles token deletion
    return { message: 'Logged out successfully' };
  }
}
