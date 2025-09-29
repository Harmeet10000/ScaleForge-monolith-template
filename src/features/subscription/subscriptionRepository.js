import { Subscription } from './subscriptionModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';

export const createSubscriptionWithIdempotency = asyncHandler(
  async (subscriptionData, idempotencyKey, requestHash) =>
    await Subscription.createWithIdempotency(subscriptionData, idempotencyKey, requestHash)
);

export const findSubscriptionByIdempotencyKey = asyncHandler(
  async (idempotencyKey) => await Subscription.findByIdempotencyKey(idempotencyKey)
);

export const findSubscriptionById = asyncHandler(async (subscriptionId, options = {}) => {
  // Use _id since subscriptionId parameter is actually the MongoDB _id
  let query = Subscription.findById(subscriptionId);

  if (options.populate) {
    query = query.populate(options.populate);
  }

  return await query;
});

export const findSubscriptionsByCustomer = asyncHandler(
  async (customerId, filters = {}, pagination = {}) => {
    let query = Subscription.find({ customerId });

    if (filters.status) {
      query = query.where('status', filters.status);
    }

    if (filters.planId) {
      query = query.where('planId', filters.planId);
    }

    if (filters.billingCycle) {
      query = query.where('billingCycle', filters.billingCycle);
    }

    if (filters.dateRange) {
      if (filters.dateRange.start) {
        query = query.where('createdAt').gte(filters.dateRange.start);
      }
      if (filters.dateRange.end) {
        query = query.where('createdAt').lte(filters.dateRange.end);
      }
    }

    if (pagination.limit) {
      query = query.limit(pagination.limit);
    }

    if (pagination.skip) {
      query = query.skip(pagination.skip);
    }

    const sort = pagination.sort || { createdAt: -1 };
    query = query.sort(sort);

    return await query;
  }
);

export const updateSubscriptionById = asyncHandler(async (subscriptionId, updates, next, req) => {
  const subscription = await Subscription.findByIdAndUpdate(subscriptionId, updates, {
    new: true,
    runValidators: true
  });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  return subscription;
});

export const updateSubscriptionStatus = asyncHandler(
  async (subscriptionId, status, additionalData = {}) => {
    const updateData = {
      status,
      ...additionalData
    };

    if (status === 'cancelled' && !additionalData.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    return await updateSubscriptionById(subscriptionId, updateData);
  }
);

export const findSubscriptionsDueForRenewal = asyncHandler(async (bufferHours = 24) => {
  const bufferTime = new Date(Date.now() + bufferHours * 60 * 60 * 1000);

  return await Subscription.find({
    status: 'active',
    nextBillingDate: { $lte: bufferTime }
  }).sort({ nextBillingDate: 1 });
});

export const findExpiredSubscriptions = asyncHandler(
  async () =>
    await Subscription.find({
      status: 'active',
      currentPeriodEnd: { $lt: new Date() }
    }).sort({ currentPeriodEnd: 1 })
);

export const findActiveSubscriptionsByPlan = asyncHandler(
  async (planId) =>
    await Subscription.find({
      planId,
      status: 'active',
      currentPeriodEnd: { $gt: new Date() }
    })
);

export const findSubscriptionsByStatus = asyncHandler(async (status, options = {}) => {
  const query = Subscription.find({
    status: Array.isArray(status) ? { $in: status } : status
  });

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }

  if (options.populate) {
    query.populate(options.populate);
  }

  return await query;
});

export const findSubscriptionsByDateRange = asyncHandler(
  async (startDate, endDate, options = {}) => {
    const query = Subscription.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (options.status) {
      query.where('status', options.status);
    }

    if (options.customerId) {
      query.where('customerId', options.customerId);
    }

    if (options.planId) {
      query.where('planId', options.planId);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 });
    }

    return await query;
  }
);

export const getSubscriptionStatistics = asyncHandler(async (filters = {}) => {
  const pipeline = [];

  const matchStage = {};
  if (filters.dateRange) {
    matchStage.createdAt = {};
    if (filters.dateRange.start) {
      matchStage.createdAt.$gte = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      matchStage.createdAt.$lte = filters.dateRange.end;
    }
  }

  if (filters.planId) {
    matchStage.planId = filters.planId;
  }

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push({
    $group: {
      _id: {
        status: '$status',
        billingCycle: '$billingCycle'
      },
      count: { $sum: 1 },
      totalRevenue: { $sum: '$amount' },
      avgAmount: { $avg: '$amount' }
    }
  });

  const results = await Subscription.aggregate(pipeline);

  const statistics = {
    byStatus: {},
    byBillingCycle: {},
    total: {
      count: 0,
      revenue: 0
    }
  };

  results.forEach((result) => {
    const { status, billingCycle } = result._id;

    if (!statistics.byStatus[status]) {
      statistics.byStatus[status] = {
        count: 0,
        revenue: 0,
        avgAmount: 0
      };
    }
    statistics.byStatus[status].count += result.count;
    statistics.byStatus[status].revenue += result.totalRevenue;
    statistics.byStatus[status].avgAmount = result.avgAmount;

    if (!statistics.byBillingCycle[billingCycle]) {
      statistics.byBillingCycle[billingCycle] = {
        count: 0,
        revenue: 0,
        avgAmount: 0
      };
    }
    statistics.byBillingCycle[billingCycle].count += result.count;
    statistics.byBillingCycle[billingCycle].revenue += result.totalRevenue;
    statistics.byBillingCycle[billingCycle].avgAmount = result.avgAmount;

    statistics.total.count += result.count;
    statistics.total.revenue += result.totalRevenue;
  });

  return statistics;
});

export const countSubscriptions = asyncHandler(async (filters = {}) => {
  let query = Subscription.find();

  if (filters.customerId) {
    query = query.where('customerId', filters.customerId);
  }

  if (filters.status) {
    query = query.where('status', filters.status);
  }

  if (filters.planId) {
    query = query.where('planId', filters.planId);
  }

  return await query.countDocuments();
});

export const addSubscriptionAuditEntry = asyncHandler(
  async (
    subscriptionId,
    operation,
    operationType,
    userId,
    details,
    ipAddress,
    userAgent,
    status,
    errorMessage,
    next,
    req
  ) => {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    await subscription.addAuditEntry(
      operation,
      operationType,
      userId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    );

    return subscription;
  }
);

export const setSubscriptionIdempotencyKey = asyncHandler(
  async (subscriptionId, key, requestHash, next, req) => {
    const subscription = await Subscription.findOne({ subscriptionId });
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    await subscription.setIdempotencyKey(key, requestHash);
    return subscription;
  }
);

export const findSubscriptionsByIds = asyncHandler(
  async (subscriptionIds) => await Subscription.find({ subscriptionId: { $in: subscriptionIds } })
);

export const bulkUpdateSubscriptions = asyncHandler(
  async (filter, updates) => await Subscription.updateMany(filter, updates)
);

export const bulkUpdateSubscriptionStatuses = asyncHandler(async (updates) => {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { subscriptionId: update.subscriptionId },
      update: update.updateData,
      upsert: false
    }
  }));

  return await Subscription.bulkWrite(bulkOps);
});

export const deleteSubscriptionById = asyncHandler(
  async (subscriptionId) =>
    await updateSubscriptionStatus(subscriptionId, 'cancelled', {
      cancelledAt: new Date(),
      'metadata.deletedAt': new Date(),
      'metadata.deleted': true
    })
);

export const markSubscriptionAsExpired = asyncHandler(async (subscriptionId, next, req) => {
  const subscription = await Subscription.findOne({ subscriptionId });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  await subscription.expire();
  return subscription;
});

export const markSubscriptionAsActive = asyncHandler(async (subscriptionId, next, req) => {
  const subscription = await Subscription.findOne({ subscriptionId });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  await subscription.activate();
  return subscription;
});

export const cancelSubscriptionById = asyncHandler(async (subscriptionId, reason, next, req) => {
  const subscription = await Subscription.findOne({ subscriptionId });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  await subscription.cancel(reason);
  return subscription;
});

export const suspendSubscriptionById = asyncHandler(async (subscriptionId, reason, next, req) => {
  const subscription = await Subscription.findOne({ subscriptionId });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  await subscription.suspend(reason);
  return subscription;
});

export const renewSubscriptionPeriod = asyncHandler(async (subscriptionId, next, req) => {
  const subscription = await Subscription.findOne({ subscriptionId });
  if (!subscription) {
    return httpError(next, new Error('Subscription not found'), req, 404);
  }

  await subscription.renewPeriod();
  return subscription;
});

export const getCustomerSubscriptionStats = asyncHandler(async (customerId) => {
  const stats = await Subscription.aggregate([
    { $match: { customerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const totalSubscriptions = await Subscription.countDocuments({ customerId });
  const totalActiveAmount = await Subscription.aggregate([
    { $match: { customerId, status: 'active' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return {
    totalSubscriptions,
    totalActiveAmount: totalActiveAmount[0]?.total || 0,
    statusBreakdown: stats
  };
});
