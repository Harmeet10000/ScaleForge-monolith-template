import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import * as recommendationsService from './recommendationsService.js';
import asyncHandler from 'express-async-handler';
import {
  getUserRecommendationsSchema,
  getSimilarItemsSchema,
  getTrendingSchema,
  trackEventSchema,
  trackBatchEventsSchema,
  getInsightsSchema,
  validateUserId,
  validateItemId,
  validateNumResults
} from './recommendationsValidation.js';

export const getUserRecommendations = asyncHandler(async (req, res, next) => {
  const { error } = validateJoiSchema(getUserRecommendationsSchema, {
    params: req.params,
    query: req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const userId = validateUserId(req.params.userId);
  const numResults = validateNumResults(req.query.numResults);

  const recommendations = await recommendationsService.getUserRecommendations(userId, numResults);

  return httpResponse(req, res, 200, null, {
    userId,
    recommendations,
    count: recommendations.length,
    cached: req.query.fresh !== 'true'
  });
});

export const getSimilarItems = asyncHandler(async (req, res, next) => {
  const { error } = validateJoiSchema(getSimilarItemsSchema, {
    params: req.params,
    query: req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const itemId = validateItemId(req.params.itemId);
  const userId = req.query.userId ? validateUserId(req.query.userId) : null;
  const numResults = validateNumResults(req.query.numResults);

  const recommendations = await recommendationsService.getSimilarItems(itemId, userId, numResults);

  return httpResponse(req, res, 200, null, {
    itemId,
    userId,
    recommendations,
    count: recommendations.length
  });
});

export const getTrendingItems = asyncHandler(async (req, res, next) => {
  const { error } = validateJoiSchema(getTrendingSchema, { query: req.query });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const numResults = validateNumResults(req.query.numResults);

  const recommendations = await recommendationsService.getTrendingItems(numResults);

  return httpResponse(req, res, 200, null, {
    recommendations,
    count: recommendations.length,
    type: 'trending'
  });
});

export const trackEvent = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(trackEventSchema, { body: req.body });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, itemId, eventType, sessionId, properties } = value.body;

  const eventData = {
    userId: validateUserId(userId),
    itemId: validateItemId(itemId),
    eventType,
    sessionId: sessionId || req.sessionID || `session_${Date.now()}`,
    properties: properties || {},
    timestamp: new Date()
  };

  const result = await recommendationsService.trackUserEvent(eventData);

  return httpResponse(req, res, 200, 'Event tracked successfully', result);
});

export const trackBatchEvents = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(trackBatchEventsSchema, { body: req.body });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { events } = value.body;

  const validatedEvents = events.map((event) => ({
    ...event,
    userId: validateUserId(event.userId),
    itemId: validateItemId(event.itemId),
    sessionId: event.sessionId || req.sessionID || `session_${Date.now()}`,
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date()
  }));

  const results = await recommendationsService.trackBatchEvents(validatedEvents);

  return httpResponse(req, res, 200, 'Batch events processed', {
    results,
    totalEvents: events.length,
    successfulUsers: results.filter((r) => r.success).length,
    failedUsers: results.filter((r) => !r.success).length
  });
});

export const getRecommendationInsights = asyncHandler(async (req, res, next) => {
  const { error } = validateJoiSchema(getInsightsSchema, { params: req.params });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const userId = req.params.userId ? validateUserId(req.params.userId) : null;

  const insights = {
    userId,
    availableRecommendationTypes: ['user-based', 'item-similarity', 'trending'],
    cacheStatus: 'active',
    lastUpdated: new Date().toISOString()
  };

  if (userId) {
    insights.userSpecific = {
      hasPersonalizedData: true,
      recommendationQuality: 'high'
    };
  }

  return httpResponse(req, res, 200, null, insights);
});
