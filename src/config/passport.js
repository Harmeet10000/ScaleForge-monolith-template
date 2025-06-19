import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../models/userModel.js';
import { httpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/v1/auth/google/callback',
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const existingUser = await User.findOne({ oauth_id: profile.id, provider: 'google' });

        if (existingUser) {
          return done(null, existingUser);
        }

        const user = await User.create({
          oauth_id: profile.id,
          provider: 'google',
          name: profile.displayName,
          emailAddress: profile.emails[0].value,
          image: profile.photos[0].value,
          timezone: 'UTC',
          phoneNumber: {
            isoCode: '',
            countryCode: '',
            internationalNumber: ''
          },
          consent: true,
          accountConfirmation: {
            status: true,
            token: '',
            code: '',
            timestamp: new Date()
          }
        });

        return done(null, user);
      } catch (error) {
        logger.error('Error in Google strategy', { error });

        return done(httpError(done, error, 500));
      }
    }
  )
);
