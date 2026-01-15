/**
 * WebSocket Authentication Guard
 * Protects WebSocket connections requiring authentication
 */

import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Authentication token required');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      
      // Attach user to socket data
      const user = this.authService.getUserById(payload.sub) || {
        id: payload.sub,
        googleId: payload.googleId,
        email: payload.email,
        displayName: payload.displayName,
      };

      (client as any).user = user;
      client.data.user = user;
      
      return true;
    } catch (error) {
      throw new WsException('Invalid or expired token');
    }
  }

  private extractToken(client: Socket): string | null {
    // Try to get token from handshake query
    const queryToken = client.handshake.query?.token;
    if (queryToken) {
      return Array.isArray(queryToken) ? queryToken[0] : queryToken;
    }

    // Try to get token from handshake auth
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Try to get token from Authorization header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
