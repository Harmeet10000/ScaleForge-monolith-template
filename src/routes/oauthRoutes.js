import express from 'express';
import passport from 'passport';
import { httpResponse } from '../utils/httpResponse.js';
import { catchAsync } from '../utils/catchAsync.js';
import { OAuthService } from '../services/oauthService.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  catchAsync(async (req, res, next) => {
    try {
      // Get or create user using the service
      const user = await OAuthService.findOrCreateUser(req.user, 'google', req, next);

      // Generate JWT token
      const token = OAuthService.generateToken(user);

      // Set cookie options with proper parseInt
      const cookieOptions = {
        expires: new Date(
          Date.now() + parseInt(process.env.JWT_COOKIE_EXPIRES_IN || '1', 10) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      };

      // Send token as cookie
      res.cookie('jwt', token, cookieOptions);

      // Redirect to frontend with success
      res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}`);
    } catch (error) {
      return next(error);
    }
  })
);

// Logout route
router.get('/logout', (req, res) => {
  res.clearCookie('jwt');
  return httpResponse.success(res, { message: 'Logged out successfully' });
});

export default router;
