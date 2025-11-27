import { Subscription } from './subscriptionModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';

/**
 * Helper to add session to query options if provided
 * @param {mongoose.ClientSession} session - Optional session for transactions
 * @returns {Object} Options object with session if provided
 */
const getSessionOptions = (session = null) => (session ? { session } : {});

export const createSubscriptionWithIdempotency = asyncHandler(
  async (subscriptionData, idempotencyKey, requestHash, session = null) =>
    await Subscription.createWithIdempotency(subscriptionData, idempotencyKey, requestHash, session)
);

export const findSubscriptionByIdempotencyKey = asyncHandler(
  async (idempotencyKey, session = null) => {
    const options = getSessionOptions(session);
    return await Subscription.findByIdempotencyKey(idempotencyKey, options);
  }
);

export const findSubscriptionById = asyncHandler(
  async (subscriptionId, options = {}, session = null) => {
    let query = Subscription.findById(subscriptionId);

    if (session) {
      query = query.session(session);
    }

    if (options.populate) {
      query = query.populate(options.populate);
    }

    return await query.exec();
  }
);

export const findSubscriptionsByCustomer = asyncHandler(
  async (customerId, filters = {}, pagination = {}, session = null) => {
    let query = Subscription.find({ customerId });

    if (session) {
      query = query.session(session);
    }

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

    return await query.exec();
  }
);

export const updateSubscriptionById = asyncHandler(
  async (subscriptionId, updates, session = null) => {
    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    const subscription = await Subscription.findByIdAndUpdate(subscriptionId, updates, options);
    if (!subscription) {
      throw new httpError('Subscription not found', 404);
    }

    return subscription;
  }
);

export const updateSubscriptionStatus = asyncHandler(
  async (subscriptionId, status, additionalData = {}, session = null) => {
    const updateData = {
      status,
      ...additionalData
    };

    if (status === 'cancelled' && !additionalData.cancelledAt) {
      updateData.cancelledAt = new Date();
    }

    return await updateSubscriptionById(subscriptionId, updateData, session);
  }
);

export const findSubscriptionsDueForRenewal = asyncHandler(
  async (bufferHours = 24, session = null) => {
    const bufferTime = new Date(Date.now() + bufferHours * 60 * 60 * 1000);

    let query = Subscription.find({
      status: 'active',
      nextBillingDate: { $lte: bufferTime }
    }).sort({ nextBillingDate: 1 });

    if (session) {
      query = query.session(session);
    }

    return await query.exec();
  }
);

export const findExpiredSubscriptions = asyncHandler(async (session = null) => {
  let query = Subscription.find({
    status: 'active',
    currentPeriodEnd: { $lt: new Date() }
  }).sort({ currentPeriodEnd: 1 });

  if (session) {
    query = query.session(session);
  }

  return await query.exec();
});

export const findActiveSubscriptionsByPlan = asyncHandler(async (planId, session = null) => {
  let query = Subscription.find({
    planId,
    status: 'active',
    currentPeriodEnd: { $gt: new Date() }
  });

  if (session) {
    query = query.session(session);
  }

  return await query.exec();
});

export const findSubscriptionsByStatus = asyncHandler(
  async (status, options = {}, session = null) => {
    let query = Subscription.find({
      status: Array.isArray(status) ? { $in: status } : status
    });

    if (session) {
      query = query.session(session);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    if (options.populate) {
      query = query.populate(options.populate);
    }

    return await query.exec();
  }
);

export const findSubscriptionsByDateRange = asyncHandler(
  async (startDate, endDate, options = {}, session = null) => {
    let query = Subscription.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (session) {
      query = query.session(session);
    }

    if (options.status) {
      query = query.where('status', options.status);
    }

    if (options.customerId) {
      query = query.where('customerId', options.customerId);
    }

    if (options.planId) {
      query = query.where('planId', options.planId);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.sort) {
      query = query.sort(options.sort);
    } else {
      query = query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }
);

export const getSubscriptionStatistics = asyncHandler(async (filters = {}, session = null) => {
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

  let query = Subscription.aggregate(pipeline);
  if (session) {
    query = query.session(session);
  }

  const results = await query.exec();

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

export const countSubscriptions = asyncHandler(async (filters = {}, session = null) => {
  let query = Subscription.find();

  if (session) {
    query = query.session(session);
  }

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
    session = null
  ) => {
    const subscription = await Subscription.findById(subscriptionId)
      .session(session || null)
      .exec();
    if (!subscription) {
      throw new httpError('Subscription not found', 404);
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

    if (session) {
      await subscription.save({ session });
    } else {
      await subscription.save();
    }

    return subscription;
  }
);

export const setSubscriptionIdempotencyKey = asyncHandler(
  async (subscriptionId, key, requestHash, session = null) => {
    const subscription = await Subscription.findOne({ subscriptionId })
      .session(session || null)
      .exec();
    if (!subscription) {
      throw new httpError('Subscription not found', 404);
    }

    await subscription.setIdempotencyKey(key, requestHash);
    if (session) {
      await subscription.save({ session });
    } else {
      await subscription.save();
    }
    return subscription;
  }
);

export const findSubscriptionsByIds = asyncHandler(async (subscriptionIds, session = null) => {
  let query = Subscription.find({ subscriptionId: { $in: subscriptionIds } });
  if (session) {
    query = query.session(session);
  }
  return await query.exec();
});

export const bulkUpdateSubscriptions = asyncHandler(async (filter, updates, session = null) => {
  const options = {};
  if (session) {
    options.session = session;
  }
  return await Subscription.updateMany(filter, updates, options);
});

export const bulkUpdateSubscriptionStatuses = asyncHandler(async (updates, session = null) => {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { subscriptionId: update.subscriptionId },
      update: update.updateData,
      upsert: false
    }
  }));

  const options = {};
  if (session) {
    options.session = session;
  }

  return await Subscription.bulkWrite(bulkOps, options);
});

export const deleteSubscriptionById = asyncHandler(
  async (subscriptionId, session = null) =>
    await updateSubscriptionStatus(
      subscriptionId,
      'cancelled',
      {
        cancelledAt: new Date(),
        'metadata.deletedAt': new Date(),
        'metadata.deleted': true
      },
      session
    )
);

export const markSubscriptionAsExpired = asyncHandler(async (subscriptionId, session = null) => {
  const subscription = await Subscription.findOne({ subscriptionId })
    .session(session || null)
    .exec();
  if (!subscription) {
    throw new httpError('Subscription not found', 404);
  }

  await subscription.expire();
  if (session) {
    await subscription.save({ session });
  } else {
    await subscription.save();
  }
  return subscription;
});

export const markSubscriptionAsActive = asyncHandler(async (subscriptionId, session = null) => {
  const subscription = await Subscription.findOne({ subscriptionId })
    .session(session || null)
    .exec();
  if (!subscription) {
    throw new httpError('Subscription not found', 404);
  }

  await subscription.activate();
  if (session) {
    await subscription.save({ session });
  } else {
    await subscription.save();
  }
  return subscription;
});

export const cancelSubscriptionById = asyncHandler(
  async (subscriptionId, reason, session = null) => {
    const subscription = await Subscription.findOne({ subscriptionId })
      .session(session || null)
      .exec();
    if (!subscription) {
      throw new httpError('Subscription not found', 404);
    }

    await subscription.cancel(reason);
    if (session) {
      await subscription.save({ session });
    } else {
      await subscription.save();
    }
    return subscription;
  }
);

export const suspendSubscriptionById = asyncHandler(
  async (subscriptionId, reason, session = null) => {
    const subscription = await Subscription.findOne({ subscriptionId })
      .session(session || null)
      .exec();
    if (!subscription) {
      throw new httpError('Subscription not found', 404);
    }

    await subscription.suspend(reason);
    if (session) {
      await subscription.save({ session });
    } else {
      await subscription.save();
    }
    return subscription;
  }
);

export const renewSubscriptionPeriod = asyncHandler(async (subscriptionId, session = null) => {
  const subscription = await Subscription.findOne({ subscriptionId })
    .session(session || null)
    .exec();
  if (!subscription) {
    throw new httpError('Subscription not found', 404);
  }

  await subscription.renewPeriod();
  if (session) {
    await subscription.save({ session });
  } else {
    await subscription.save();
  }
  return subscription;
});

export const getCustomerSubscriptionStats = asyncHandler(async (customerId, session = null) => {
  let statsQuery = Subscription.aggregate([
    { $match: { customerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  if (session) {
    statsQuery = statsQuery.session(session);
  }

  const stats = await statsQuery.exec();

  let totalSubscriptionsQuery = Subscription.countDocuments({ customerId });
  if (session) {
    totalSubscriptionsQuery = totalSubscriptionsQuery.session(session);
  }

  const totalSubscriptions = await totalSubscriptionsQuery.exec();

  let totalActiveAmountQuery = Subscription.aggregate([
    { $match: { customerId, status: 'active' } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  if (session) {
    totalActiveAmountQuery = totalActiveAmountQuery.session(session);
  }

  const totalActiveAmount = await totalActiveAmountQuery.exec();

  return {
    totalSubscriptions,
    totalActiveAmount: totalActiveAmount[0]?.total || 0,
    statusBreakdown: stats
  };
});
