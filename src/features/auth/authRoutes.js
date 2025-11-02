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
} from './authController.js';
import { protect } from './authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Authentication failed"
 *         error:
 *           type: object
 *     AuthSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *     UserResponse:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60c7c8d4f8b6c8001f8e4b8a"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         emailAddress:
 *           type: string
 *           example: "john.doe@example.com"
 *         phoneNumber:
 *           type: object
 *           properties:
 *             countryCode:
 *               type: string
 *               example: "+1"
 *             isoCode:
 *               type: string
 *               example: "US"
 *             internationalNumber:
 *               type: string
 *               example: "+1 555-123-4567"
 *         role:
 *           type: string
 *           example: "user"
 *         timezone:
 *           type: string
 *           example: "America/New_York"
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register new user
 *     description: Create a new user account with email verification
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - emailAddress
 *               - phoneNumber
 *               - password
 *               - consent
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 72
 *                 example: "John Doe"
 *               emailAddress:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               phoneNumber:
 *                 type: string
 *                 minLength: 4
 *                 maxLength: 20
 *                 example: "15551234567"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "SecurePass123!"
 *               consent:
 *                 type: boolean
 *                 example: true
 *           example:
 *             name: "John Doe"
 *             emailAddress: "john.doe@example.com"
 *             phoneNumber: "15551234567"
 *             password: "SecurePass123!"
 *             consent: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "60c7c8d4f8b6c8001f8e4b8a"
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User already exists with this email"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Validation error"
 *               error:
 *                 details: "Password must be at least 8 characters long"
 */
router.post('/register', register);
/**
 * @swagger
 * /auth/confirmation/{email}:
 *   put:
 *     summary: Confirm user account
 *     description: Confirm user account using email and verification code
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *         example: "john.doe@example.com"
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *         description: 6-digit verification code
 *         example: "123456"
 *     responses:
 *       200:
 *         description: Account confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *             example:
 *               success: true
 *               message: "Success"
 *       400:
 *         description: Bad request - Invalid code or already confirmed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid account confirmation email or code"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User not found"
 */
router.put('/confirmation/:email', confirmation);
/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return access/refresh tokens with cookies
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailAddress
 *               - password
 *             properties:
 *               emailAddress:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "SecurePass123!"
 *           example:
 *             emailAddress: "john.doe@example.com"
 *             password: "SecurePass123!"
 *     responses:
 *       200:
 *         description: Login successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: HTTP-only cookies with access and refresh tokens
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Bad request - Invalid credentials or account not confirmed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid email or password"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User not found"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.post('/login', login);
/**
 * @swagger
 * /auth/logout:
 *   put:
 *     summary: User logout
 *     description: Logout user and clear authentication cookies
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Cleared authentication cookies
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *             example:
 *               success: true
 *               message: "Success"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Authentication required"
 */
router.put('/logout', protect, logout);
/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access token using refresh token from cookies
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: New access token generated successfully
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             description: Updated access token cookie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Unauthorized - Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Unauthorized"
 */
router.post('/refresh-token', genNewAccessToken);
/**
 * @swagger
 * /auth/forgot-password:
 *   put:
 *     summary: Request password reset
 *     description: Send password reset email to user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailAddress
 *             properties:
 *               emailAddress:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@example.com"
 *           example:
 *             emailAddress: "john.doe@example.com"
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *             example:
 *               success: true
 *               message: "Success"
 *       400:
 *         description: Bad request - Account not confirmed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Account confirmation required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User not found"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.put('/forgot-password', forgotPassword);
/**
 * @swagger
 * /auth/reset-password/{token}:
 *   put:
 *     summary: Reset password
 *     description: Reset user password using reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *         example: "abc123def456ghi789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "NewSecurePass123!"
 *           example:
 *             newPassword: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *             example:
 *               success: true
 *               message: "Success"
 *       400:
 *         description: Bad request - Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Expired URL"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User not found"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.put('/reset-password/:token', resetPassword);
/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Change password
 *     description: Change user password (requires authentication)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *               - confirmNewPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "OldSecurePass123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "NewSecurePass123!"
 *               confirmNewPassword:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 24
 *                 example: "NewSecurePass123!"
 *           example:
 *             oldPassword: "OldSecurePass123!"
 *             newPassword: "NewSecurePass123!"
 *             confirmNewPassword: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthSuccess'
 *             example:
 *               success: true
 *               message: "Success"
 *       400:
 *         description: Bad request - Invalid old password or passwords match
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid old password"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Authentication required"
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User not found"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.put('/change-password', protect, changePassword);
/**
 * @swagger
 * /auth/google-oauth/signup:
 *   post:
 *     summary: Google OAuth signup
 *     description: Register new user using Google OAuth credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - email
 *               - name
 *             properties:
 *               id:
 *                 type: string
 *                 description: Google user ID
 *                 example: "1234567890123456789"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@gmail.com"
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 72
 *                 example: "John Doe"
 *               picture:
 *                 type: string
 *                 format: uri
 *                 description: Google profile picture URL
 *                 example: "https://lh3.googleusercontent.com/a/default-user"
 *           example:
 *             id: "1234567890123456789"
 *             email: "john.doe@gmail.com"
 *             name: "John Doe"
 *             picture: "https://lh3.googleusercontent.com/a/default-user"
 *     responses:
 *       201:
 *         description: Google OAuth signup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Google OAuth signup successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     domain:
 *                       type: string
 *                       example: "localhost"
 *       400:
 *         description: Bad request - Invalid Google OAuth data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid Google OAuth credentials"
 *       409:
 *         description: Conflict - User already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "User already exists"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.post('/google-oauth/signup', googleOAuthSignupHandler);
/**
 * @swagger
 * /auth/google-oauth/login:
 *   post:
 *     summary: Google OAuth login
 *     description: Authenticate existing user using Google OAuth credentials
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - email
 *             properties:
 *               id:
 *                 type: string
 *                 description: Google user ID
 *                 example: "1234567890123456789"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john.doe@gmail.com"
 *           example:
 *             id: "1234567890123456789"
 *             email: "john.doe@gmail.com"
 *     responses:
 *       200:
 *         description: Google OAuth login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Google OAuth login successful"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     domain:
 *                       type: string
 *                       example: "localhost"
 *       400:
 *         description: Bad request - Invalid Google OAuth data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid Google OAuth credentials"
 *       401:
 *         description: Unauthorized - Invalid Google OAuth credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 *             example:
 *               success: false
 *               message: "Invalid Google OAuth credentials"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthError'
 */
router.post('/google-oauth/login', googleOAuthLoginHandler);

export default router;
