import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import asyncHandler from 'express-async-handler';
import {
  validateCreateSubscriptionRequest,
  validateGetSubscriptionRequest,
  validateUpdateSubscriptionRequest,
  validateCancelSubscriptionRequest,
  validateRenewSubscriptionRequest,
  validateGetCustomerSubscriptionsRequest,
  validateGetDueForRenewalRequest,
  validateGetStatisticsRequest,
  validateProcessRenewalsRequest
} from './subscriptionValidation.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import * as subscriptionService from './subscriptionService.js';

/**
 * Create a new subscription
 */
export const createSubscription = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateCreateSubscriptionRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = req;
  const userId = req.user?._id;
  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await subscriptionService.createSubscription(
    value,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  const statusCode = result.isIdempotent ? 200 : 201;
  const message = result.isIdempotent
    ? 'Subscription retrieved (idempotent request)'
    : 'Subscription created successfully';

  httpResponse(req, res, statusCode, message, {
    subscription: result.subscription,
    isIdempotent: result.isIdempotent
  });
});

/**
 * Get subscription by ID
 */
export const getSubscription = asyncHandler(async (req, res, next) => {
  const requestData = {
    subscriptionId: req.params.subscriptionId
  };

  const { error, value } = validateJoiSchema(validateGetSubscriptionRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const subscription = await subscriptionService.getSubscriptionById(
    value.subscriptionId,
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscription retrieved successfully', {
    subscription
  });
});

/**
 * Update subscription
 */
export const updateSubscription = asyncHandler(async (req, res, next) => {
  const requestData = {
    subscriptionId: req.params.subscriptionId,
    ...req.body
  };

  const { error, value } = validateJoiSchema(validateUpdateSubscriptionRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = req;
  const userId = req.user?._id;
  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const { subscriptionId, ...updates } = value;
  const subscription = await subscriptionService.updateSubscription(
    subscriptionId,
    updates,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscription updated successfully', {
    subscription
  });
});

/**
 * Cancel subscription
 */
export const cancelSubscription = asyncHandler(async (req, res, next) => {
  const requestData = {
    subscriptionId: req.params.subscriptionId,
    ...req.body
  };

  const { error, value } = validateJoiSchema(validateCancelSubscriptionRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = req;
  const userId = req.user?._id;
  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const { subscriptionId, ...cancellationData } = value;
  const subscription = await subscriptionService.cancelSubscription(
    subscriptionId,
    correlationId,
    userId,
    cancellationData,
    requestContext,
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscription cancelled successfully', {
    subscription
  });
});

/**
 * Renew subscription
 */
export const renewSubscription = asyncHandler(async (req, res, next) => {
  const requestData = {
    subscriptionId: req.params.subscriptionId,
    ...req.body
  };

  const { error, value } = validateJoiSchema(validateRenewSubscriptionRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = req;
  const userId = req.user?._id;
  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const { subscriptionId, ...renewalData } = value;
  const subscription = await subscriptionService.renewSubscription(
    subscriptionId,
    correlationId,
    userId,
    renewalData,
    requestContext,
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscription renewed successfully', {
    subscription
  });
});

/**
 * Get customer subscriptions
 */
export const getCustomerSubscriptions = asyncHandler(async (req, res, next) => {
  const requestData = {
    customerId: req.params.customerId,
    ...req.query
  };

  const { error, value } = validateJoiSchema(validateGetCustomerSubscriptionsRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  // Extract filters and pagination from validated data
  const { customerId, status, planId, limit, sort } = value;
  const filters = { status, planId };
  const pagination = { limit, sort: sort ? JSON.parse(sort) : { createdAt: -1 } };

  const result = await subscriptionService.getSubscriptionsByCustomer(
    customerId,
    filters,
    pagination,
    next,
    req
  );

  httpResponse(req, res, 200, 'Customer subscriptions retrieved successfully', result);
});

/**
 * Get subscriptions due for renewal
 */
export const getSubscriptionsDueForRenewal = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetDueForRenewalRequest, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { bufferHours } = value;

  const subscriptions = await subscriptionService.getSubscriptionsDueForRenewal(
    value.bufferHours,
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscriptions due for renewal retrieved successfully', {
    subscriptions,
    count: subscriptions.length,
    bufferHours
  });
});

/**
 * Get subscription statistics
 */
export const getSubscriptionStatistics = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetStatisticsRequest, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  // Extract filters from validated data
  const filters = {};

  if (value.startDate || value.endDate) {
    filters.dateRange = {};
    if (value.startDate) {
      filters.dateRange.start = new Date(value.startDate);
    }
    if (value.endDate) {
      filters.dateRange.end = new Date(value.endDate);
    }
  }

  if (value.planId) {
    filters.planId = value.planId;
  }

  const statistics = await subscriptionService.getSubscriptionStatistics(filters, next, req);

  httpResponse(req, res, 200, 'Subscription statistics retrieved successfully', {
    statistics,
    filters
  });
});

/**
 * Process subscription renewals (batch operation)
 */
export const processRenewals = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateProcessRenewalsRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = req;
  const userId = req.user?._id;
  const { bufferHours, dryRun } = value;

  const result = await subscriptionService.processRenewals(
    correlationId,
    userId,
    {
      bufferHours,
      dryRun
    },
    next,
    req
  );

  httpResponse(req, res, 200, 'Subscription renewals processed successfully', result);
});
