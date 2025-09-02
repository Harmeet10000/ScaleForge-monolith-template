import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import * as subscriptionRepository from './subscriptionRepository.js';

const generateIdempotencyKey = (correlationId, operationType) => {
  `${correlationId}_${operationType}`;
};

const generateRequestHash = (data) => {
  const hashData = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(hashData).digest('hex');
};

const validateSubscriptionData = (data, next, req) => {
  const required = ['customerId', 'planId', 'planName', 'billingCycle', 'amount'];
  const missing = required.filter((field) => !data[field]);

  if (missing.length > 0) {
    return httpError(next, new Error(`Missing required fields: ${missing.join(', ')}`), req, 400);
  }

  if (!['monthly', 'quarterly', 'annual'].includes(data.billingCycle)) {
    return httpError(next, new Error('Invalid billing cycle'), req, 400);
  }

  if (data.amount <= 0) {
    return httpError(next, new Error('Amount must be greater than 0'), req, 400);
  }
};

const validateSubscriptionUpdates = (updates, currentSubscription, next, req) => {
  if (updates.status && !['active', 'cancelled', 'suspended', 'expired'].includes(updates.status)) {
    return httpError(next, new Error('Invalid status'), req, 400);
  }

  if (updates.billingCycle && !['monthly', 'quarterly', 'annual'].includes(updates.billingCycle)) {
    return httpError(next, new Error('Invalid billing cycle'), req, 400);
  }

  if (updates.amount && updates.amount <= 0) {
    return httpError(next, new Error('Amount must be greater than 0'), req, 400);
  }

  if (currentSubscription.status === 'cancelled' && updates.status !== 'active') {
    return httpError(
      next,
      new Error('Cannot modify cancelled subscription except to reactivate'),
      req,
      400
    );
  }
};

const calculateBillingDates = (billingCycle, startDate = new Date(), trialDays = 0, next, req) => {
  const periodStart = new Date(startDate);
  const trialEnd =
    trialDays > 0 ? new Date(periodStart.getTime() + trialDays * 24 * 60 * 60 * 1000) : null;

  const periodEnd = new Date(trialEnd || periodStart);

  switch (billingCycle) {
    case 'monthly':
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      break;
    case 'quarterly':
      periodEnd.setMonth(periodEnd.getMonth() + 3);
      break;
    case 'annual':
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      break;
    default:
      return httpError(next, new Error(`Invalid billing cycle: ${billingCycle}`), req, 400);
  }

  return {
    periodStart,
    periodEnd,
    nextBilling: periodEnd,
    trialEnd
  };
};

const calculateRenewalDates = (subscription, renewalData = {}) => {
  const periodStart = renewalData.startDate || subscription.currentPeriodEnd;
  return calculateBillingDates(subscription.billingCycle, periodStart);
};

const calculateProration = (subscription, updates) => {
  const now = new Date();
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));

  const currentDailyRate = subscription.amount / totalPeriodDays;
  const newDailyRate = updates.amount / totalPeriodDays;

  const prorationAmount = (newDailyRate - currentDailyRate) * remainingDays;

  return {
    totalPeriodDays,
    remainingDays,
    currentDailyRate,
    newDailyRate,
    prorationAmount,
    calculatedAt: now
  };
};

const calculateProrationRefund = (subscription) => {
  const now = new Date();
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const usedDays = Math.ceil((now - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = totalPeriodDays - usedDays;

  const dailyRate = subscription.amount / totalPeriodDays;
  const refundAmount = dailyRate * remainingDays;

  return {
    totalPeriodDays,
    usedDays,
    remainingDays,
    dailyRate,
    refundAmount: Math.max(0, refundAmount)
  };
};

export const createSubscription = asyncHandler(
  async (subscriptionData, correlationId, userId, requestContext = {}, next, req) => {
    const idempotencyKey = generateIdempotencyKey(correlationId, 'subscription_create');
    const requestHash = generateRequestHash(subscriptionData);

    const existingSubscription =
      await subscriptionRepository.findSubscriptionByIdempotencyKey(idempotencyKey);
    if (existingSubscription) {
      logger.info('Returning existing subscription due to idempotency', {
        meta: {
          correlationId,
          subscriptionId: existingSubscription.subscriptionId,
          isIdempotent: true
        }
      });
      return {
        subscription: existingSubscription,
        isIdempotent: true
      };
    }

    validateSubscriptionData(subscriptionData, next, req);

    const billingDates = calculateBillingDates(
      subscriptionData.billingCycle,
      subscriptionData.startDate,
      subscriptionData.trialDays,
      next,
      req
    );

    const subscriptionPayload = {
      customerId: subscriptionData.customerId,
      planId: subscriptionData.planId,
      planName: subscriptionData.planName,
      billingCycle: subscriptionData.billingCycle,
      amount: subscriptionData.amount,
      currency: subscriptionData.currency || 'INR',
      status: subscriptionData.trialDays > 0 ? 'active' : 'pending',
      currentPeriodStart: billingDates.periodStart,
      currentPeriodEnd: billingDates.periodEnd,
      nextBillingDate: billingDates.nextBilling,
      trialEnd: billingDates.trialEnd,
      metadata: {
        ...subscriptionData.metadata,
        correlationId,
        createdBy: userId,
        creationContext: requestContext
      }
    };

    const subscription = await subscriptionRepository.createSubscriptionWithIdempotency(
      subscriptionPayload,
      idempotencyKey,
      requestHash
    );

    await subscriptionRepository.addSubscriptionAuditEntry(
      subscription.subscriptionId,
      'Subscription created',
      'subscription_create',
      userId,
      {
        before: null,
        after: subscription.toObject(),
        operationData: { correlationId, planId: subscriptionData.planId }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Subscription created successfully', {
      meta: {
        correlationId,
        subscriptionId: subscription.subscriptionId,
        customerId: subscription.customerId,
        planId: subscription.planId,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount
      }
    });

    return {
      subscription,
      isIdempotent: false
    };
  }
);

export const updateSubscription = asyncHandler(
  async (subscriptionId, updates, correlationId, userId, requestContext = {}, next, req) => {
    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    const originalState = subscription.toObject();

    validateSubscriptionUpdates(updates, subscription, next, req);

    const updatedFields = {};
    if (updates.planId && updates.planId !== subscription.planId) {
      updatedFields.planId = updates.planId;
      updatedFields.planName = updates.planName || subscription.planName;

      if (updates.amount && updates.amount !== subscription.amount) {
        updatedFields.amount = updates.amount;
        const prorationData = calculateProration(subscription, updates);
        updatedFields.metadata = {
          ...subscription.metadata,
          proration: prorationData,
          lastPlanChange: new Date(),
          correlationId
        };
      }
    }

    if (updates.billingCycle && updates.billingCycle !== subscription.billingCycle) {
      updatedFields.billingCycle = updates.billingCycle;
      const newBillingDates = calculateBillingDates(
        updates.billingCycle,
        subscription.currentPeriodStart,
        0,
        next,
        req
      );
      updatedFields.currentPeriodEnd = newBillingDates.periodEnd;
      updatedFields.nextBillingDate = newBillingDates.nextBilling;
    }

    if (updates.status && updates.status !== subscription.status) {
      updatedFields.status = updates.status;
      if (updates.status === 'cancelled') {
        updatedFields.cancelledAt = new Date();
      }
    }

    const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
      subscriptionId,
      updatedFields,
      next,
      req
    );

    await subscriptionRepository.addSubscriptionAuditEntry(
      subscriptionId,
      'Subscription updated',
      'subscription_update',
      userId,
      {
        before: originalState,
        after: updatedSubscription.toObject(),
        operationData: { correlationId, updates: updatedFields }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Subscription updated successfully', {
      meta: {
        correlationId,
        subscriptionId,
        updatedFields: Object.keys(updatedFields),
        previousStatus: originalState.status,
        newStatus: updatedSubscription.status
      }
    });

    return updatedSubscription;
  }
);

export const cancelSubscription = asyncHandler(
  async (
    subscriptionId,
    correlationId,
    userId,
    cancellationData = {},
    requestContext = {},
    next,
    req
  ) => {
    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    if (subscription.status === 'cancelled') {
      logger.info('Subscription already cancelled', {
        meta: {
          correlationId,
          subscriptionId,
          cancelledAt: subscription.cancelledAt
        }
      });
      return subscription;
    }

    const originalState = subscription.toObject();

    const immediate = cancellationData.immediate || false;
    const refundProrated = cancellationData.refundProrated || false;

    const cancellationDetails = {
      cancelledAt: new Date(),
      cancellationReason: cancellationData.reason || 'User requested',
      immediate,
      refundProrated,
      correlationId
    };

    let updatedSubscription;
    if (immediate) {
      const updateData = {
        status: 'cancelled',
        cancelledAt: new Date(),
        'metadata.cancellation': cancellationDetails
      };

      if (refundProrated) {
        const refundAmount = calculateProrationRefund(subscription);
        cancellationDetails.refundAmount = refundAmount;
        updateData['metadata.cancellation'] = cancellationDetails;
      }

      updatedSubscription = await subscriptionRepository.updateSubscriptionById(
        subscriptionId,
        updateData
      );
    } else {
      const updateData = {
        'metadata.scheduledCancellation': {
          scheduledFor: subscription.currentPeriodEnd,
          reason: cancellationData.reason,
          requestedAt: new Date(),
          correlationId
        },
        'metadata.cancellation': cancellationDetails
      };

      updatedSubscription = await subscriptionRepository.updateSubscriptionById(
        subscriptionId,
        updateData
      );
    }

    await subscriptionRepository.addSubscriptionAuditEntry(
      subscriptionId,
      immediate ? 'Subscription cancelled immediately' : 'Subscription scheduled for cancellation',
      'subscription_cancel',
      userId,
      {
        before: originalState,
        after: updatedSubscription.toObject(),
        operationData: { correlationId, cancellationData }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Subscription cancellation processed', {
      meta: {
        correlationId,
        subscriptionId,
        immediate,
        status: updatedSubscription.status,
        refundAmount: cancellationDetails.refundAmount?.refundAmount || 0
      }
    });

    return updatedSubscription;
  }
);

export const renewSubscription = asyncHandler(
  async (
    subscriptionId,
    correlationId,
    userId,
    renewalData = {},
    requestContext = {},
    next,
    req
  ) => {
    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    if (!['active', 'expired'].includes(subscription.status)) {
      return httpError(
        next,
        new Error(`Cannot renew subscription with status: ${subscription.status}`),
        req,
        400
      );
    }

    const originalState = subscription.toObject();

    const renewalDates = calculateRenewalDates(subscription, renewalData);

    const updateData = {
      currentPeriodStart: renewalDates.periodStart,
      currentPeriodEnd: renewalDates.periodEnd,
      nextBillingDate: renewalDates.nextBilling,
      status: 'active',
      'metadata.lastRenewal': {
        renewedAt: new Date(),
        correlationId,
        renewalType: renewalData.type || 'automatic',
        previousPeriodEnd: originalState.currentPeriodEnd
      }
    };

    const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
      subscriptionId,
      updateData
    );

    await subscriptionRepository.addSubscriptionAuditEntry(
      subscriptionId,
      'Subscription renewed',
      'subscription_renew',
      userId,
      {
        before: originalState,
        after: updatedSubscription.toObject(),
        operationData: { correlationId, renewalDates }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Subscription renewed successfully', {
      meta: {
        correlationId,
        subscriptionId,
        newPeriodEnd: updatedSubscription.currentPeriodEnd,
        renewalType: renewalData.type || 'automatic',
        previousPeriodEnd: originalState.currentPeriodEnd
      }
    });

    return updatedSubscription;
  }
);

export const getSubscriptionsByCustomer = asyncHandler(
  async (customerId, filters = {}, pagination = {}) => {
    const subscriptions = await subscriptionRepository.findSubscriptionsByCustomer(
      customerId,
      filters,
      pagination
    );

    const total = await subscriptionRepository.countSubscriptions({ customerId, ...filters });

    logger.info('Customer subscriptions retrieved successfully', {
      meta: {
        customerId,
        count: subscriptions.length,
        total,
        filters
      }
    });

    return {
      subscriptions,
      pagination: {
        total,
        limit: pagination.limit || 10,
        hasMore: subscriptions.length === (pagination.limit || 10)
      }
    };
  }
);

export const getSubscriptionById = asyncHandler(async (subscriptionId, next, req) => {
  const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);

  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  logger.info('Subscription retrieved successfully', {
    meta: {
      subscriptionId,
      customerId: subscription.customerId,
      status: subscription.status,
      planId: subscription.planId
    }
  });

  return subscription;
});

export const getSubscriptionsDueForRenewal = asyncHandler(async (bufferHours = 24) => {
  const subscriptions = await subscriptionRepository.findSubscriptionsDueForRenewal(bufferHours);

  logger.info('Found subscriptions due for renewal', {
    meta: {
      count: subscriptions.length,
      bufferHours,
      subscriptionIds: subscriptions.map((s) => s.subscriptionId)
    }
  });

  return subscriptions;
});

export const getSubscriptionStatistics = asyncHandler(async (filters = {}) => {
  const results = await subscriptionRepository.getSubscriptionStatistics(filters);

  logger.info('Retrieved subscription statistics', {
    meta: {
      totalCount: results.total.count,
      totalRevenue: results.total.revenue,
      statusBreakdown: Object.keys(results.byStatus),
      billingCycleBreakdown: Object.keys(results.byBillingCycle),
      filters
    }
  });

  return results;
});

export const processRenewals = asyncHandler(async (correlationId, userId, options = {}) => {
  const { bufferHours = 24, dryRun = false } = options;

  const dueSubscriptions = await getSubscriptionsDueForRenewal(bufferHours);

  const results = {
    total: dueSubscriptions.length,
    processed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  if (dryRun) {
    logger.info('Dry run mode - no actual renewals processed', {
      meta: {
        correlationId,
        totalDue: dueSubscriptions.length,
        subscriptionIds: dueSubscriptions.map((s) => s.subscriptionId),
        bufferHours
      }
    });

    results.details = dueSubscriptions.map((sub) => ({
      subscriptionId: sub.subscriptionId,
      customerId: sub.customerId,
      nextBillingDate: sub.nextBillingDate,
      amount: sub.amount,
      status: 'would_renew'
    }));

    return results;
  }

  for (const subscription of dueSubscriptions) {
    try {
      const renewed = await renewSubscription(subscription.subscriptionId, correlationId, userId, {
        type: 'automatic'
      });

      results.processed++;
      results.details.push({
        subscriptionId: subscription.subscriptionId,
        customerId: subscription.customerId,
        status: 'renewed',
        newPeriodEnd: renewed.currentPeriodEnd
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        subscriptionId: subscription.subscriptionId,
        customerId: subscription.customerId,
        status: 'failed',
        error: error.message
      });

      logger.error('Failed to renew subscription', {
        meta: {
          correlationId,
          subscriptionId: subscription.subscriptionId,
          error: error.message,
          stack: error.stack,
          customerId: subscription.customerId
        }
      });
    }
  }

  logger.info('Completed subscription renewals processing', {
    meta: {
      correlationId,
      results: {
        total: results.total,
        processed: results.processed,
        failed: results.failed,
        skipped: results.skipped
      },
      bufferHours,
      processingTime: Date.now() - new Date().getTime()
    }
  });

  return results;
});
