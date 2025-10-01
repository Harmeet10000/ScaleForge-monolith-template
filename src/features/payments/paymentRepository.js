import { Payment } from './paymentModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';
import { EPaymentStatus } from './paymentConstants.js';

export const createPaymentWithIdempotency = asyncHandler(
  async (paymentData, idempotencyKey, requestHash) =>
    await Payment.createWithIdempotency(paymentData, idempotencyKey, requestHash)
);

export const findPaymentByIdempotencyKey = asyncHandler(
  async (idempotencyKey) => await Payment.findByIdempotencyKey(idempotencyKey)
);

export const findPaymentById = asyncHandler(async (paymentId) => await Payment.findById(paymentId));

export const findPaymentByCorrelationId = asyncHandler(
  async (correlationId) => await Payment.findByCorrelationId(correlationId)
);

export const findPaymentByRazorpayOrderId = asyncHandler(async (razorpayOrderId) => {
  const payment = await Payment.findOne({ razorpayOrderId });
  return payment;
});

export const findPaymentsByCustomer = asyncHandler(async (customerId, options = {}) => {
  const result = await Payment.findByCustomer(customerId, options);
  return result;
});

export const findPendingPayments = asyncHandler(async () => {
  await Payment.findPendingPayments();
});

export const updatePaymentById = asyncHandler(async (paymentId, updateData) => {
  const payment = await Payment.findByIdAndUpdate(paymentId, updateData, {
    new: true,
    runValidators: true
  });

  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  return payment;
});

export const updatePaymentStatus = asyncHandler(async (paymentId, status, additionalData = {}) => {
  const updateData = {
    status,
    ...additionalData
  };

  // Set completion timestamp for completed payments
  if (status === EPaymentStatus.COMPLETED && !additionalData.completedAt) {
    updateData.completedAt = new Date();
  }

  return await updatePaymentById(paymentId, updateData);
});

export const incrementPaymentRetryCount = asyncHandler(async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.incrementRetry();
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
    errorMessage
  ) => {
    const payment = await Payment.findById(paymentId);
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

    return payment;
  }
);

export const canPaymentBeRetried = asyncHandler(async (paymentId, maxRetries = 3) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  return payment.canRetry(maxRetries);
});

export const markPaymentAsCompleted = asyncHandler(async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsCompleted();
  return payment;
});

export const markPaymentAsFailed = asyncHandler(async (paymentId, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsFailed(reason);
  return payment;
});

export const setPaymentIdempotencyKey = asyncHandler(async (paymentId, key, requestHash) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.setIdempotencyKey(key, requestHash);
  return payment;
});

export const findPaymentsByIds = asyncHandler(
  async (paymentIds) => await Payment.find({ _id: { $in: paymentIds } })
);

export const findPaymentsByStatus = asyncHandler(async (status, options = {}) => {
  const query = Payment.find({
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

export const findPaymentsByDateRange = asyncHandler(async (startDate, endDate, options = {}) => {
  const query = Payment.find({
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

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }

  return await query;
});

export const getCustomerPaymentStats = asyncHandler(async (customerId) => {
  const stats = await Payment.aggregate([
    { $match: { customerId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const totalPayments = await Payment.countDocuments({ customerId });
  const totalAmount = await Payment.aggregate([
    { $match: { customerId, status: EPaymentStatus.COMPLETED } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);

  return {
    totalPayments,
    totalCompletedAmount: totalAmount[0]?.total || 0,
    statusBreakdown: stats
  };
});

export const deletePaymentById = asyncHandler(
  async (paymentId) =>
    await updatePaymentStatus(paymentId, EPaymentStatus.CANCELLED, {
      metadata: {
        deletedAt: new Date(),
        deleted: true
      }
    })
);

export const findExpiredPayments = asyncHandler(
  async () =>
    await Payment.find({
      status: { $in: [EPaymentStatus.PENDING, EPaymentStatus.PROCESSING] },
      expiresAt: { $lt: new Date() }
    })
);

export const bulkUpdatePayments = asyncHandler(async (updates) => {
  const bulkOps = updates.map((update) => ({
    updateOne: {
      filter: { _id: update.paymentId },
      update: update.updateData,
      upsert: false
    }
  }));

  return await Payment.bulkWrite(bulkOps);
});
