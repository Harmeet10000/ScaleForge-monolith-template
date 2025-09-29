import { Payment } from './paymentModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';
import { EPaymentStatus } from './paymentConstants.js';

/**
 * Create a new payment with idempotency support
 * @param {Object} paymentData - Payment data
 * @param {string} idempotencyKey - Idempotency key
 * @param {string} requestHash - Request hash
 * @returns {Promise<Object>} Created payment
 */
export const createPaymentWithIdempotency = asyncHandler(
  async (paymentData, idempotencyKey, requestHash) =>
    await Payment.createWithIdempotency(paymentData, idempotencyKey, requestHash)
);

/**
 * Find payment by idempotency key
 * @param {string} idempotencyKey - Idempotency key
 * @returns {Promise<Object|null>} Payment or null
 */
export const findPaymentByIdempotencyKey = asyncHandler(
  async (idempotencyKey) => await Payment.findByIdempotencyKey(idempotencyKey)
);

/**
 * Find payment by payment ID (MongoDB _id)
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @returns {Promise<Object|null>} Payment or null
 */
export const findPaymentById = asyncHandler(async (paymentId) => await Payment.findById(paymentId));

/**
 * Find payment by correlation ID
 * @param {string} correlationId - Correlation ID
 * @returns {Promise<Object|null>} Payment or null
 */
export const findPaymentByCorrelationId = asyncHandler(
  async (correlationId) => await Payment.findByCorrelationId(correlationId)
);

/**
 * Find payment by Razorpay order ID
 * @param {string} razorpayOrderId - Razorpay order ID
 * @returns {Promise<Object|null>} Payment or null
 */
export const findPaymentByRazorpayOrderId = asyncHandler(async (razorpayOrderId) => {
  const payment = await Payment.findOne({ razorpayOrderId });
  return payment;
});

/**
 * Find payments by customer ID with options
 * @param {string} customerId - Customer ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of payments
 */
export const findPaymentsByCustomer = asyncHandler(async (customerId, options = {}) => {
  const result = await Payment.findByCustomer(customerId, options);
  return result;
});

/**
 * Find pending payments
 * @returns {Promise<Array>} Array of pending payments
 */
export const findPendingPayments = asyncHandler(async () => {
  await Payment.findPendingPayments();
});

/**
 * Update payment by ID (MongoDB _id)
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} Updated payment
 */
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

/**
 * Update payment status
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<Object>} Updated payment
 */
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

/**
 * Increment retry count for a payment
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @returns {Promise<Object>} Updated payment
 */
export const incrementPaymentRetryCount = asyncHandler(async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.incrementRetry();
  return payment;
});

/**
 * Add audit entry to payment
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {string} operation - Operation description
 * @param {string} operationType - Operation type
 * @param {string} userId - User ID
 * @param {Object} details - Operation details
 * @param {string} ipAddress - IP address
 * @param {string} userAgent - User agent
 * @param {string} status - Operation status
 * @param {string} errorMessage - Error message (optional)
 * @returns {Promise<Object>} Updated payment
 */
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

/**
 * Check if payment can be retried
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<boolean>} Whether payment can be retried
 */
export const canPaymentBeRetried = asyncHandler(async (paymentId, maxRetries = 3) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  return payment.canRetry(maxRetries);
});

/**
 * Mark payment as completed
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @returns {Promise<Object>} Updated payment
 */
export const markPaymentAsCompleted = asyncHandler(async (paymentId) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsCompleted();
  return payment;
});

/**
 * Mark payment as failed
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {string} reason - Failure reason
 * @returns {Promise<Object>} Updated payment
 */
export const markPaymentAsFailed = asyncHandler(async (paymentId, reason) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.markAsFailed(reason);
  return payment;
});

/**
 * Set idempotency key for payment
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @param {string} key - Idempotency key
 * @param {string} requestHash - Request hash
 * @returns {Promise<Object>} Updated payment
 */
export const setPaymentIdempotencyKey = asyncHandler(async (paymentId, key, requestHash) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) {
    throw new httpError('Payment not found', 404);
  }

  await payment.setIdempotencyKey(key, requestHash);
  return payment;
});

/**
 * Find payments by multiple payment IDs
 * @param {Array} paymentIds - Array of payment IDs (MongoDB _ids)
 * @returns {Promise<Array>} Array of payments
 */
export const findPaymentsByIds = asyncHandler(
  async (paymentIds) => await Payment.find({ _id: { $in: paymentIds } })
);

/**
 * Find payments by status
 * @param {string|Array} status - Payment status or array of statuses
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of payments
 */
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

/**
 * Find payments by date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of payments
 */
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

/**
 * Get payment statistics for a customer
 * @param {string} customerId - Customer ID
 * @returns {Promise<Object>} Payment statistics
 */
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

/**
 * Delete payment by ID (soft delete by updating status)
 * @param {string} paymentId - Payment ID (MongoDB _id)
 * @returns {Promise<Object>} Updated payment
 */
export const deletePaymentById = asyncHandler(
  async (paymentId) =>
    await updatePaymentStatus(paymentId, EPaymentStatus.CANCELLED, {
      metadata: {
        deletedAt: new Date(),
        deleted: true
      }
    })
);

/**
 * Find expired payments
 * @returns {Promise<Array>} Array of expired payments
 */
export const findExpiredPayments = asyncHandler(
  async () =>
    await Payment.find({
      status: { $in: [EPaymentStatus.PENDING, EPaymentStatus.PROCESSING] },
      expiresAt: { $lt: new Date() }
    })
);

/**
 * Bulk update payment statuses
 * @param {Array} updates - Array of update objects with paymentId and updateData
 * @returns {Promise<Object>} Bulk update result
 */
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
