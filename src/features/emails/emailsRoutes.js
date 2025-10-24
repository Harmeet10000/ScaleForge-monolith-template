import express from 'express';
import { getEmails, classifyEmails } from './emailsController.js';
import { betterAuthProtect } from '../auth/betterAuthMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /emails:
 *   get:
 *     summary: Fetch emails from Gmail
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 15
 *         description: Number of emails to fetch
 *     responses:
 *       200:
 *         description: Emails fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', betterAuthProtect, getEmails);

/**
 * @swagger
 * /emails/classify:
 *   post:
 *     summary: Classify emails using Gemini AI
 *     tags: [Emails]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emailIds
 *               - geminiApiKey
 *             properties:
 *               emailIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               geminiApiKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Emails classified successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/classify', betterAuthProtect, classifyEmails);

export default router;
