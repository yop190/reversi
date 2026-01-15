/**
 * Google OAuth Strategy
 * Handles Google OAuth 2.0 authentication
 */

import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger(GoogleStrategy.name);
  
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || 'not-configured';
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET') || 'not-configured';
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL') || 
      'https://ca-reversi-backend.graystone-893f55ee.westeurope.azurecontainerapps.io/auth/google/callback';

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
      passReqToCallback: false,
    });

    if (clientID === 'not-configured' || clientSecret === 'not-configured') {
      console.warn('⚠️ Google OAuth not configured - authentication will be disabled');
    } else {
      console.log('✅ Google OAuth configured');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;
    
    const user = {
      googleId: id,
      email: emails?.[0]?.value || '',
      displayName: displayName || 'Unknown',
      photoUrl: photos?.[0]?.value,
      accessToken,
    };

    done(null, user);
  }
}
