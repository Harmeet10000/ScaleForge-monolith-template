import express from 'express';
import {
  changePassword,
  confirmation,
  forgotPassword,
  genNewAccessToken,
  login,
  logout,
  register,
  resetPassword,
  googleOAuthSignupHandler,
  googleOAuthLoginHandler
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', register);
router.put('/confirmation/:email', confirmation);
router.post('/login', login);
router.put('/logout', protect, logout);
router.post('/refresh-token', genNewAccessToken);
router.put('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/change-password', protect, changePassword);
router.post('/google-oauth/signup', googleOAuthSignupHandler);
router.post('/google-oauth/login', googleOAuthLoginHandler);

export default router;
