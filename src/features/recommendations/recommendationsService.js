import AWS from 'aws-sdk';
import asyncHandler from 'express-async-handler';
import { getCache, setCache, deleteCache } from '../../helpers/cache/redisFunctions.js';

// Initialize AWS clients
const personalizeRuntime = new AWS.PersonalizeRuntime({
  region: process.env.AWS_REGION
});

const personalizeEvents = new AWS.PersonalizeEvents({
  region: process.env.AWS_REGION
});

// Cache utilities
const getCachedRecommendations = async (keyParts) => getCache('recommendations', keyParts);

const setCachedRecommendations = async (keyParts, data, ttl = 3600) =>
  setCache('recommendations', keyParts, data, ttl);

// Core recommendation functions
export const getUserRecommendations = asyncHandler(async (userId, numResults = 20) => {
  const keyParts = ['user', userId];

  // Check cache first
  const cachedResults = await getCachedRecommendations(keyParts);
  if (cachedResults) {
    return cachedResults;
  }

  const params = {
    campaignArn: process.env.PERSONALIZE_USER_CAMPAIGN_ARN,
    userId: userId.toString(),
    numResults
  };

  const response = await personalizeRuntime.getRecommendations(params).promise();
  const recommendations = (response.itemList || []).map((item) => ({
    itemId: item.itemId,
    score: item.score
  }));

  // Cache results
  await setCachedRecommendations(keyParts, recommendations, 1800); // 30 minutes

  return recommendations;
});

export const getSimilarItems = asyncHandler(async (itemId, userId = null, numResults = 20) => {
  const keyParts = ['similar', userId || 'anonymous', itemId];

  // Check cache first
  const cachedResults = await getCachedRecommendations(keyParts);
  if (cachedResults) {
    return cachedResults;
  }

  const params = {
    campaignArn: process.env.PERSONALIZE_SIMS_CAMPAIGN_ARN,
    itemId: itemId.toString(),
    numResults
  };

  if (userId) {
    params.userId = userId.toString();
  }

  const response = await personalizeRuntime.getRecommendations(params).promise();
  const recommendations = (response.itemList || []).map((item) => ({
    itemId: item.itemId,
    score: item.score
  }));

  // Cache results
  await setCachedRecommendations(keyParts, recommendations, 7200); // 2 hours

  return recommendations;
});

export const getTrendingItems = asyncHandler(async (numResults = 20) => {
  const keyParts = ['trending', 'global'];

  // Check cache first
  const cachedResults = await getCachedRecommendations(keyParts);
  if (cachedResults) {
    return cachedResults;
  }

  const params = {
    campaignArn: process.env.PERSONALIZE_POPULARITY_CAMPAIGN_ARN,
    numResults
  };

  const response = await personalizeRuntime.getRecommendations(params).promise();
  const recommendations = (response.itemList || []).map((item) => ({
    itemId: item.itemId,
    score: item.score
  }));

  // Cache results for longer since trending changes slowly
  await setCachedRecommendations(keyParts, recommendations, 3600); // 1 hour

  return recommendations;
});

export const trackUserEvent = asyncHandler(async (eventData) => {
  const { userId, sessionId, itemId, eventType, timestamp = new Date() } = eventData;

  const params = {
    trackingId: process.env.PERSONALIZE_TRACKING_ID,
    userId: userId.toString(),
    sessionId,
    eventList: [
      {
        sentAt: timestamp,
        eventType,
        itemId: itemId.toString(),
        properties: JSON.stringify(eventData.properties || {})
      }
    ]
  };

  await personalizeEvents.putEvents(params).promise();

  // Invalidate related cache entries
  const userKeyParts = ['user', userId];
  await deleteCache('recommendations', userKeyParts);

  return { success: true };
});

export const trackBatchEvents = asyncHandler(async (events) => {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Events must be a non-empty array');
  }

  // Group events by user for better tracking
  const eventsByUser = events.reduce((acc, event) => {
    const { userId } = event;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(event);
    return acc;
  }, {});

  const results = [];

  for (const [userId, userEvents] of Object.entries(eventsByUser)) {
    const eventList = userEvents.map((event) => ({
      sentAt: event.timestamp || new Date(),
      eventType: event.eventType,
      itemId: event.itemId.toString(),
      properties: JSON.stringify(event.properties || {})
    }));

    const params = {
      trackingId: process.env.PERSONALIZE_TRACKING_ID,
      userId: userId.toString(),
      sessionId: userEvents[0].sessionId,
      eventList
    };

    await personalizeEvents.putEvents(params).promise();

    // Invalidate user cache
    const userKeyParts = ['user', userId];
    await deleteCache('recommendations', userKeyParts);

    results.push({ userId, success: true, eventCount: userEvents.length });
  }

  return results;
});
