import express from 'express';
import {
  generateTextHandler,
  generateTextStreamHandler,
  embedTextHandler,
  generateImageHandler,
  generateVideoHandler,
  generateJsonHandler,
  generateMultimodalHandler,
  createChatHandler
} from './geminiController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gemini
 *   description: Endpoints for interacting with Google Gemini models.
 */

/**
 * @swagger
 * /gemini/generate-text:
 *   post:
 *     summary: Generate text from a prompt.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-text', generateTextHandler);

/**
 * @swagger
 * /gemini/generate-text-stream:
 *   post:
 *     summary: Generate text from a prompt as a stream.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-text-stream', generateTextStreamHandler);

/**
 * @swagger
 * /gemini/embed-text:
 *   post:
 *     summary: Embed text into a vector representation.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/embed-text', embedTextHandler);

/**
 * @swagger
 * /gemini/generate-image:
 *   post:
 *     summary: Generate an image from a prompt.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-image', generateImageHandler);

/**
 * @swagger
 * /gemini/generate-video:
 *   post:
 *     summary: Generate a video from a prompt.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *               poll:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-video', generateVideoHandler);

/**
 * @swagger
 * /gemini/generate-json:
 *   post:
 *     summary: Generate a JSON object from a prompt and schema.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *               schema:
 *                 type: object
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-json', generateJsonHandler);

/**
 * @swagger
 * /gemini/generate-multimodal:
 *   post:
 *     summary: Generate content from a multimodal prompt.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               parts:
 *                 type: array
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/generate-multimodal', generateMultimodalHandler);

/**
 * @swagger
 * /gemini/create-chat:
 *   post:
 *     summary: Create a new chat session.
 *     tags: [Gemini]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               systemInstruction:
 *                 type: string
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
router.post('/create-chat', createChatHandler);

export default router;
