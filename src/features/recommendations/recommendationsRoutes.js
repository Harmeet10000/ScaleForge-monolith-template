import express from 'express';
import {
  getRecommendationInsights,
  getSimilarItems,
  getTrendingItems,
  getUserRecommendations,
  trackBatchEvents,
  trackEvent
} from './recommendationsController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Recommendations
 *   description: Personalized recommendations and tracking endpoints
 */

/**
 * @swagger
 * /recommendations/user/{userId}:
 *   get:
 *     summary: Get personalized recommendations for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User identifier
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Personalized recommendations returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       itemId:
 *                         type: string
 *                       score:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/user/:userId', getUserRecommendations);

/**
 * @swagger
 * /recommendations/item/{itemId}/similar:
 *   get:
 *     summary: Get items similar to the provided item
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *         description: Item identifier
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Optional user id to personalize similar items
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Similar items returned
 */
router.get('/item/:itemId/similar', getSimilarItems);

/**
 * @swagger
 * /recommendations/trending:
 *   get:
 *     summary: Get globally trending/popular items
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: numResults
 *         schema:
 *           type: integer
 *         description: Number of results to return
 *     responses:
 *       200:
 *         description: Trending items returned
 */
router.get('/trending', getTrendingItems);

/**
 * @swagger
 * /recommendations/events:
 *   post:
 *     summary: Track a single recommendation event
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, eventType]
 *             properties:
 *               userId:
 *                 type: string
 *               eventType:
 *                 type: string
 *               itemId:
 *                 type: string
 *               properties:
 *                 type: object
 *     responses:
 *       200:
 *         description: Event tracked successfully
 */
router.post('/events', trackEvent);

/**
 * @swagger
 * /recommendations/events/batch:
 *   post:
 *     summary: Track multiple recommendation events in batch
 *     tags: [Recommendations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [userId, eventType]
 *               properties:
 *                 userId:
 *                   type: string
 *                 eventType:
 *                   type: string
 *                 itemId:
 *                   type: string
 *                 properties:
 *                   type: object
 *     responses:
 *       200:
 *         description: Batch events processed
 */
router.post('/events/batch', trackBatchEvents);

/**
 * @swagger
 * /recommendations/insights/{userId}:
 *   get:
 *     summary: Get recommendation insights (optional user)
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional user id to fetch personalized insights
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Insights returned
 */
router.get('/insights/:userId?', getRecommendationInsights);

export default router;
