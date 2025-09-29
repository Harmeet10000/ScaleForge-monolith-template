import Joi from 'joi';

export const getUserRecommendationsSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().required()
  }),
  query: Joi.object({
    numResults: Joi.number().integer().min(1).max(500).optional(),
    fresh: Joi.string().optional()
  })
});

export const getSimilarItemsSchema = Joi.object({
  params: Joi.object({
    itemId: Joi.string().required()
  }),
  query: Joi.object({
    userId: Joi.string().optional(),
    numResults: Joi.number().integer().min(1).max(500).optional()
  })
});

export const getTrendingSchema = Joi.object({
  query: Joi.object({
    numResults: Joi.number().integer().min(1).max(500).optional()
  })
});

export const trackEventSchema = Joi.object({
  body: Joi.object({
    userId: Joi.string().required(),
    itemId: Joi.string().required(),
    eventType: Joi.string().required(),
    sessionId: Joi.string().optional(),
    properties: Joi.object().optional()
  })
});

export const trackBatchEventsSchema = Joi.object({
  body: Joi.object({
    events: Joi.array()
      .items(
        Joi.object({
          userId: Joi.string().required(),
          itemId: Joi.string().required(),
          eventType: Joi.string().required(),
          sessionId: Joi.string().optional(),
          properties: Joi.object().optional(),
          timestamp: Joi.any().optional()
        })
      )
      .min(1)
      .required()
  })
});

export const getInsightsSchema = Joi.object({
  params: Joi.object({
    userId: Joi.string().optional().allow(null, '')
  })
});

// Helper validators moved from controller for reuse and consistency with authController
export const validateUserId = (userId) => {
  if (!userId || String(userId).trim() === '') {
    throw new Error('User ID is required');
  }
  return String(userId).trim();
};

export const validateItemId = (itemId) => {
  if (!itemId || String(itemId).trim() === '') {
    throw new Error('Item ID is required');
  }
  return String(itemId).trim();
};

export const validateNumResults = (numResults) => {
  const num = parseInt(numResults, 10);
  if (isNaN(num) || num < 1 || num > 500) {
    return 20; // Default value
  }
  return num;
};
