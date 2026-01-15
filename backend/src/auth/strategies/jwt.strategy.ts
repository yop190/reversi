/**
 * JWT Strategy
 * Validates JWT tokens for protected routes
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const secretKey = configService.get<string>('JWT_SECRET') || 'reversi-jwt-secret-change-in-production';

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Extract from query parameter (for WebSocket connections)
        (req: any) => req?.query?.token || req?.handshake?.query?.token || null,
      ]),
      ignoreExpiration: false,
      secretOrKey: secretKey,
    });
  }

  async validate(payload: JwtPayload) {
    const user = this.authService.getUserById(payload.sub);
    
    if (!user) {
      // User might be from a different server instance (stateless)
      // Reconstruct user from JWT payload
      return {
        id: payload.sub,
        googleId: payload.googleId,
        email: payload.email,
        displayName: payload.displayName,
      };
    }

    return user;
  }
}
