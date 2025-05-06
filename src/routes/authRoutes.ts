import express, { Router } from 'express';
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

const router: Router = express.Router();

router.post('/register', register);
router.put('/confirmation/:token', confirmation);
router.post('/login', login);
router.put('/logout', protect, logout);
router.post('/refresh-token', genNewAccessToken);
router.put('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.put('/change-password', protect, changePassword);

export default router;
