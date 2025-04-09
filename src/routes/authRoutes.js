import express from 'express'
import {
    changePassword,
    confirmation,
    forgotPassword,
    login,
    logout,
    refreshToken,
    register,
    resetPassword,
} from '../controllers/authController.js'
import { protect } from '../middlewares/authMiddleware.js'

const router = express.Router()

router.post('/register', register)
router.put('/confirmation/:token', confirmation)
router.post('/login', login)
router.put('/logout', protect, logout)
router.post('/refresh-token', refreshToken)
router.put('/forgot-password', forgotPassword)
router.put('/reset-password/:token', resetPassword)
router.put('/change-password', protect, changePassword)

export default router

