import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { httpResponse } from '../utils/httpResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import config from '../config/dotenvConfig.js';
import * as authService from '../services/authService.js'; // Changed to named import
import { IUser } from '../types/userTypes.js';
import { logger } from '../utils/logger.js';

const generateAndSendTokens = async (user: IUser, res: Response) => {
  const { accessToken, refreshToken } = await authService.generateAuthTokens(user);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: config.ACCESS_TOKEN_EXPIRY
  });
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: config.REFRESH_TOKEN_EXPIRY
  });

  httpResponse(res, 200, 'Successfully authenticated via Google.', { user, accessToken });
};

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleAuthCallback = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
      'google',
      { session: false },
      async (err: Error | null, user: IUser | false | null, info: any) => {
        if (err || !user) {
          logger.error('Google OAuth callback error:', { error: err, info });
          // Redirect to a frontend error page or send an error response
          return res.redirect(
            `${config.FRONTEND_URL}/auth/error?message=${encodeURIComponent(info?.message || 'Google authentication failed')}`
          );
        }
        // At this point, `user` is the user object from your database (found or created)
        // You can now generate JWT tokens or create a session for this user
        await generateAndSendTokens(user as IUser, res);
        // Redirect to a success page on the frontend, perhaps with tokens in query params or handle via cookies
        // res.redirect(`${config.FRONTEND_URL}/auth/success`); // Or handle token sending directly
      }
    )(req, res, next);
  }
);
