import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import config from './dotenvConfig.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/userModel.js'; // Assuming User model is exported from userModel.ts
import * as oAuthService from '../services/oauthService.js'; // Corrected import

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID as string,
      clientSecret: config.GOOGLE_CLIENT_SECRET as string,
      callbackURL: '/api/v1/oauth/google/callback',
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await oAuthService.findOrCreateUser(profile);
        done(null, user);
      } catch (error) {
        logger.error('Error in Google OAuth Strategy:', error);
        done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, (user as any).id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    logger.error('Error deserializing user:', error);
    done(error as Error, undefined);
  }
});

export default passport;
