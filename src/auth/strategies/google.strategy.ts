import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

/**
 * Google OAuth Strategy
 *
 * Handles Google OAuth 2.0 authentication flow.
 *
 * TODO: Human review required
 * - Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment
 * - Configure OAuth consent screen in Google Cloud Console
 * - Add authorized redirect URIs in Google Cloud Console
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || '',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || '',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Called after successful Google authentication
   * Returns user profile data to be used in auth flow
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, emails, displayName } = profile;

    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      name: displayName,
    };

    done(null, user);
  }
}
