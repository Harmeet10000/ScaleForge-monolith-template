import express from 'express';
import {
  changePassword,
  confirmation,
  forgotPassword,
  genNewAccessToken,
  login,
  logout,
  register,
  resetPassword
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import passport from 'passport';
import { catchAsync } from '../utils/catchAsync.js';
import { OAuthService } from '../services/oauthService.js';

const router = express.Router();

router.post('/register', register);
router.put('/confirmation/:email', confirmation);
router.post('/login', login);
router.put('/logout', protect, logout);
router.post('/refresh-token', genNewAccessToken);
router.put('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/change-password', protect, changePassword);
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

export default router;
