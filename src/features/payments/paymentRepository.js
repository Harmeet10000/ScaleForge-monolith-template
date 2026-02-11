import { Payment } from './paymentModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';
import { EPaymentStatus } from './paymentConstants.js';

/**
 * Helper to add session to query options if provided
 * @param {mongoose.ClientSession} session - Optional session for transactions
 * @returns {Object} Options object with session if provided
 */
const getSessionOptions = (session = null) => (session ? { session } : {});

export const createPaymentWithIdempotency = asyncHandler(
  async (paymentData, idempotencyKey, requestHash, session = null) =>
    await Payment.createWithIdempotency(paymentData, idempotencyKey, requestHash, session)
);

export const findPaymentByIdempotencyKey = asyncHandler(async (idempotencyKey, session = null) => {
  const options = getSessionOptions(session);
  return await Payment.findByIdempotencyKey(idempotencyKey, options);
});

export const findPaymentById = asyncHandler(async (paymentId, session = null) => {
  // const options = getSessionOptions(session);
  await Payment.findById(paymentId)
    .session(session || null)
    .exec();
});

export const findPaymentByCorrelationId = asyncHandler(async (correlationId, session = null) => {
  const options = getSessionOptions(session);
  return await Payment.findByCorrelationId(correlationId, options);
});

export const findPaymentByRazorpayOrderId = asyncHandler(
  async (razorpayOrderId, session = null) => {
    // const options = getSessionOptions(session);
    await Payment.findOne({ razorpayOrderId })
      .session(session || null)
      .exec();
  }
);

export const findPaymentsByCustomer = asyncHandler(
  async (customerId, options = {}, session = null) => {
    const baseOptions = { ...options };
    if (session) {
      baseOptions.session = session;
    }
    return await Payment.findByCustomer(customerId, baseOptions);
  }
);

export const findPendingPayments = asyncHandler(async (session = null) => {
  const options = getSessionOptions(session);
  return await Payment.findPendingPayments(options);
});

export const updatePaymentById = asyncHandler(async (paymentId, updateData, session = null) => {
  const options = { new: true, runValidators: true };
  if (session) {
    options.session = session;
  }

  const payment = await Payment.findByIdAndUpdate(paymentId, updateData, options);

  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  return payment;
});

export const updatePaymentStatus = asyncHandler(
  async (paymentId, status, additionalData = {}, session = null) => {
    const updateData = {
      status,
      ...additionalData
    };

    // Set completion timestamp for completed payments
    if (status === EPaymentStatus.COMPLETED && !additionalData.completedAt) {
      updateData.completedAt = new Date();
    }

    return await updatePaymentById(paymentId, updateData, session);
  }
);

export const incrementPaymentRetryCount = asyncHandler(async (paymentId, session = null) => {
  const payment = await Payment.findById(paymentId)
    .session(session || null)
    .exec();
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.incrementRetry();
  if (session) {
    await payment.save({ session });
  } else {
    await payment.save();
  }
  return payment;
});

export const addPaymentAuditEntry = asyncHandler(
  async (
    paymentId,
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
    const payment = await Payment.findById(paymentId)
      .session(session || null)
      .exec();
    if (!payment) {
      throw new httpError('Payment not found', 404);
    }

    await payment.addAuditEntry(
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
      await payment.save({ session });
    } else {
      await payment.save();
    }

    return payment;
  }
);

export const canPaymentBeRetried = asyncHandler(
  async (paymentId, maxRetries = 3, session = null) => {
    const payment = await Payment.findById(paymentId)
      .session(session || null)
      .exec();
    if (!payment) {
      throw new httpError('Payment not found', 404);
    }

    return payment.canRetry(maxRetries);
  }
);

export const markPaymentAsCompleted = asyncHandler(async (paymentId, session = null) => {
  const payment = await Payment.findById(paymentId)
    .session(session || null)
    .exec();
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsCompleted();
  if (session) {
    await payment.save({ session });
  } else {
    await payment.save();
  }
  return payment;
});

export const markPaymentAsFailed = asyncHandler(async (paymentId, reason, session = null) => {
  const payment = await Payment.findById(paymentId)
    .session(session || null)
    .exec();
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsFailed(reason);
  if (session) {
    await payment.save({ session });
  } else {
    await payment.save();
  }
  return payment;
});

export const setPaymentIdempotencyKey = asyncHandler(
  async (paymentId, key, requestHash, session = null) => {
    const payment = await Payment.findById(paymentId)
      .session(session || null)
      .exec();
    if (!payment) {
      throw new httpError('Payment not found', 404);
    }

    await payment.setIdempotencyKey(key, requestHash);
    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }
    return payment;
  }
);

export const findPaymentsByIds = asyncHandler(async (paymentIds, session = null) => {
  const query = Payment.find({ _id: { $in: paymentIds } });
  if (session) {
    query.session(session);
  }
  return await query.exec();
});

export const findPaymentsByStatus = asyncHandler(async (status, options = {}, session = null) => {
  const query = Payment.find({
    status: Array.isArray(status) ? { $in: status } : status
  });

  if (session) {
    query.session(session);
  }

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

  return await query.exec();
});

export const findPaymentsByDateRange = asyncHandler(
  async (startDate, endDate, options = {}, session = null) => {
    const query = Payment.find({
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    });

    if (session) {
      query.session(session);
    }

    if (options.status) {
      query.where('status', options.status);
    }

    if (options.customerId) {
      query.where('customerId', options.customerId);
    }

    if (options.limit) {
      query.limit(options.limit);
    }

    if (options.sort) {
      query.sort(options.sort);
    } else {
      query.sort({ createdAt: -1 });
    }

    return await query.exec();
  }
);

export const getCustomerPaymentStats = asyncHandler(async (customerId, session = null) => {
  const statsQuery = Payment.aggregate([
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
    statsQuery.session(session);
  }

  const stats = await statsQuery.exec();

  const totalPaymentsQuery = Payment.countDocuments({ customerId });
  if (session) {
    totalPaymentsQuery.session(session);
  }
  const totalPayments = await totalPaymentsQuery.exec();

  const totalAmountQuery = Payment.aggregate([
    { $match: { customerId, status: EPaymentStatus.COMPLETED } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  if (session) {
    totalAmountQuery.session(session);
  }
  const totalAmount = await totalAmountQuery.exec();

  return {
    totalPayments,
    totalCompletedAmount: totalAmount[0]?.total || 0,
    statusBreakdown: stats
  };
});

export const deletePaymentById = asyncHandler(
  async (paymentId, session = null) =>
    await updatePaymentStatus(
      paymentId,
      EPaymentStatus.CANCELLED,
      {
        metadata: {
          deletedAt: new Date(),
          deleted: true
        }
      },
      session
    )
);

export const findExpiredPayments = asyncHandler(async (session = null) => {
  const query = Payment.find({
    status: { $in: [EPaymentStatus.PENDING, EPaymentStatus.PROCESSING] },
    expiresAt: { $lt: new Date() }
  });

  if (session) {
    query.session(session);
  }

  return await query.exec();
});

export const bulkUpdatePayments = asyncHandler(async (updates, session = null) => {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.paymentId },
      update: update.updateData,
      upsert: false
    }
  }));

  const options = {};
  if (session) {
    options.session = session;
  }

  return await Payment.bulkWrite(bulkOps, options);
});
