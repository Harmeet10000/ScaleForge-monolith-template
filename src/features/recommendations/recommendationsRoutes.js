import express from 'express';
import { getUserRecommendationsSchema } from './recommendationsValidation';
import {
  getRecommendationInsights,
  getSimilarItems,
  getTrendingItems,
  trackBatchEvents,
  trackEvent
} from './recommendationsController';

const router = express.Router();

// GET /api/recommendations/user/:userId - Get personalized recommendations for a user
router.get('/user/:userId', getUserRecommendationsSchema);

// GET /api/recommendations/item/:itemId/similar - Get similar items
router.get('/item/:itemId/similar', getSimilarItems);

// GET /api/recommendations/trending - Get trending/popular items
router.get('/trending', getTrendingItems);

// POST /api/recommendations/events - Track single user event
router.post('/events', trackEvent);

// POST /api/recommendations/events/batch - Track multiple events
router.post('/events/batch', trackBatchEvents);

// GET /api/recommendations/insights/:userId? - Get recommendation insights
router.get('/insights/:userId?', getRecommendationInsights);

export default router;
