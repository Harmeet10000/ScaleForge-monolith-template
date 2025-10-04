import Razorpay from 'razorpay';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import { EPaymentStatus, RETRY_CONFIG, DEFAULT_VALUES } from './paymentConstants.js';
import * as paymentRepository from './paymentRepository.js';
import * as auditUtils from '../audit/auditUtils.js';

// Initialize Razorpay instance
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const createPayment = asyncHandler(
  async (paymentData, correlationId, userId, requestContext = {}, req) => {
    // Generate idempotency key from request data
    const requestHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...paymentData, correlationId, userId }))
      .digest('hex');

    const idempotencyKey = `${correlationId}_${requestHash.substring(0, 16)}`;

    // Check for existing payment with same idempotency key
    const existingPayment = await paymentRepository.findPaymentByIdempotencyKey(idempotencyKey);
    if (existingPayment) {
      logger.info('Returning existing payment due to idempotency', {
        meta: {
          correlationId,
          paymentId: existingPayment.paymentId
        }
      });
      return {
        payment: existingPayment,
        isIdempotent: true
      };
    }

    // Create Razorpay order
    const razorpayOrderOptions = {
      amount: Math.round(paymentData.amount * 100), // Convert to paise
      currency: paymentData.currency || DEFAULT_VALUES.CURRENCY,
      receipt: `receipt_${correlationId}`,
      notes: {
        correlationId,
        customerId: paymentData.customerId,
        ...(paymentData.subscriptionId && { subscriptionId: paymentData.subscriptionId })
      }
    };

    const razorpayOrder = await razorpayInstance.orders.create(razorpayOrderOptions);

    // Prepare payment document
    const paymentDocument = {
      correlationId,
      razorpayOrderId: razorpayOrder.id,
      customerId: paymentData.customerId,
      subscriptionId: paymentData.subscriptionId,
      amount: paymentData.amount,
      currency: paymentData.currency || DEFAULT_VALUES.CURRENCY,
      status: EPaymentStatus.PENDING,
      metadata: {
        ...paymentData.metadata,
        razorpayOrder: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt
        }
      }
    };

    // Create payment with idempotency
    const payment = await paymentRepository.createPaymentWithIdempotency(
      paymentDocument,
      idempotencyKey,
      requestHash
    );

    // Add audit entry using new audit system
    await auditUtils.auditPaymentOperation('create', payment, {
      userId,
      correlationId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: req?.id,
      metadata: {
        razorpayOrderId: razorpayOrder.id,
        amount: paymentData.amount,
        currency: paymentData.currency
      }
    });

    logger.info('Payment created successfully', {
      meta: {
        correlationId,
        paymentId: payment.paymentId || null,
        razorpayOrderId: razorpayOrder.id
      }
    });

    return {
      payment,
      razorpayOrder,
      isIdempotent: false
    };
  }
);

export const updatePaymentStatus = asyncHandler(
  async (paymentId, status, updateData = {}, userId, requestContext = {}, req, next) => {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      return httpError(next, new Error('Payment not found'), req, 404);
    }

    const previousStatus = payment.status;

    // Prepare update data
    const updatePayload = {
      status,
      ...updateData
    };

    // Set completion timestamp for completed payments
    if (status === EPaymentStatus.COMPLETED && !updateData.completedAt) {
      updatePayload.completedAt = new Date();
    }

    // Update payment
    const updatedPayment = await paymentRepository.updatePaymentById(paymentId, updatePayload);

    // Add audit entry using new audit system
    await auditUtils.auditEntityChange(
      'payment',
      paymentId,
      `Payment status updated to ${status}`,
      { status: previousStatus },
      { status },
      {
        operationType: 'payment_update',
        userId,
        correlationId: updatedPayment.correlationId,
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        requestId: req?.id,
        operationData: updateData
      }
    );

    logger.info('Payment status updated', {
      meta: {
        correlationId: updatedPayment.correlationId,
        paymentId: updatedPayment.paymentId,
        previousStatus,
        newStatus: status
      }
    });

    return updatedPayment;
  }
);

export const retryFailedPayment = asyncHandler(
  async (paymentId, userId, requestContext = {}, req, next) => {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      return httpError(next, new Error('Payment not found'), req, 404);
    }

    // Check if payment can be retried
    const canRetry = await paymentRepository.canPaymentBeRetried(
      paymentId,
      RETRY_CONFIG.PAYMENT.MAX_RETRIES
    );
    if (!canRetry) {
      return httpError(
        next,
        new Error('Payment cannot be retried - maximum attempts reached or invalid status'),
        req,
        400
      );
    }

    logger.info('Retrying failed payment', {
      meta: {
        correlationId: payment.correlationId,
        paymentId: payment.paymentId,
        retryCount: payment.retryCount
      }
    });

    // Calculate delay for exponential backoff
    const delay = Math.min(
      RETRY_CONFIG.PAYMENT.BASE_DELAY *
        Math.pow(RETRY_CONFIG.PAYMENT.BACKOFF_MULTIPLIER, payment.retryCount),
      RETRY_CONFIG.PAYMENT.MAX_DELAY
    );

    // Increment retry count
    await paymentRepository.incrementPaymentRetryCount(paymentId);

    // Update status to processing
    await paymentRepository.updatePaymentStatus(paymentId, EPaymentStatus.PROCESSING, {
      failureReason: null
    });

    // Get updated payment for retry count
    const updatedPayment = await paymentRepository.findPaymentById(paymentId);

    // Add audit entry for retry attempt using new audit system
    await auditUtils.auditPaymentOperation('retry', updatedPayment, {
      userId,
      correlationId: payment.correlationId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: req?.id,
      metadata: {
        retryCount: updatedPayment.retryCount,
        delay,
        previousFailureReason: payment.failureReason
      }
    });

    // In a real implementation, you would schedule the retry after the delay
    // For now, we'll return the retry information
    return {
      payment: updatedPayment,
      retryScheduled: true,
      delay,
      retryCount: updatedPayment.retryCount,
      nextRetryAt: new Date(Date.now() + delay)
    };
  }
);

export const getPaymentStatusFromRazorpay = asyncHandler(async (razorpayPaymentId) => {
  const payment = await razorpayInstance.payments.fetch(razorpayPaymentId);

  logger.info('Fetched payment status from Razorpay', {
    meta: {
      razorpayPaymentId,
      status: payment.status
    }
  });

  return {
    id: payment.id,
    status: payment.status,
    method: payment.method,
    amount: payment.amount,
    currency: payment.currency,
    captured: payment.captured,
    description: payment.description,
    created_at: payment.created_at,
    error_code: payment.error_code,
    error_description: payment.error_description
  };
});

export const verifyPayment = asyncHandler(
  async (verificationData, correlationId, userId, requestContext = {}, req, next) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = verificationData;

    // Find payment by Razorpay order ID
    const payment = await paymentRepository.findPaymentByRazorpayOrderId(razorpay_order_id);
    if (!payment) {
      return httpError(next, new Error('Payment not found for the given order'), req, 404);
    }

    // Verify signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    const isSignatureValid = expectedSignature === razorpay_signature;

    if (!isSignatureValid) {
      // Mark payment as failed due to signature verification failure
      await updatePaymentStatus(
        payment.paymentId,
        EPaymentStatus.FAILED,
        { failureReason: 'Signature verification failed' },
        userId,
        requestContext,
        req,
        next
      );

      return httpError(next, new Error('Payment signature verification failed'), req, 400);
    }

    // Get payment details from Razorpay
    const razorpayPaymentDetails = await getPaymentStatusFromRazorpay(
      razorpay_payment_id,
      req,
      next
    );

    // Update payment status based on Razorpay status
    let newStatus = EPaymentStatus.COMPLETED;
    if (razorpayPaymentDetails.status === 'failed') {
      newStatus = EPaymentStatus.FAILED;
    } else if (razorpayPaymentDetails.status === 'authorized' && !razorpayPaymentDetails.captured) {
      newStatus = EPaymentStatus.PROCESSING;
    }

    const updatedPayment = await updatePaymentStatus(
      payment.paymentId,
      newStatus,
      {
        razorpayPaymentId: razorpay_payment_id,
        paymentMethod: razorpayPaymentDetails.method,
        metadata: {
          ...payment.metadata,
          razorpayPaymentDetails
        }
      },
      userId,
      requestContext,
      req,
      next
    );

    // Add verification audit entry using new audit system
    await auditUtils.auditPaymentOperation('verify', updatedPayment, {
      userId,
      correlationId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: req?.id,
      metadata: {
        razorpayPaymentId: razorpay_payment_id,
        signatureValid: isSignatureValid,
        razorpayStatus: razorpayPaymentDetails.status
      }
    });

    logger.info('Payment verification completed', {
      meta: {
        correlationId: payment.correlationId,
        paymentId: payment.paymentId,
        razorpayPaymentId: razorpay_payment_id,
        status: newStatus
      }
    });

    return {
      payment: updatedPayment,
      verified: true,
      razorpayPaymentDetails
    };
  }
);

export const getPaymentByCorrelationId = asyncHandler(async (correlationId, req, next) => {
  const payment = await paymentRepository.findPaymentByCorrelationId(correlationId);
  if (!payment) {
    return httpError(next, new Error('Payment not found'), req, 404);
  }

  return payment;
});

export const getPaymentsByCustomer = asyncHandler(async (customerId, options = {}) => {
  const payments = await paymentRepository.findPaymentsByCustomer(customerId, options);
  return payments;
});

export const getPendingPayments = asyncHandler(async () => {
  const payments = await paymentRepository.findPendingPayments();
  return payments;
});

export const calculateBackoffDelay = (retryCount, config = RETRY_CONFIG.PAYMENT) => {
  const delay = config.BASE_DELAY * Math.pow(config.BACKOFF_MULTIPLIER, retryCount);
  return Math.min(delay, config.MAX_DELAY);
};

export const processPaymentWithRetry = asyncHandler(
  async (
    paymentId,
    userId,
    requestContext = {},
    maxRetries = RETRY_CONFIG.PAYMENT.MAX_RETRIES,
    req,
    next
  ) => {
    let lastError;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      const payment = await paymentRepository.findPaymentById(paymentId);
      if (!payment) {
        return httpError(next, new Error('Payment not found'), req, 404);
      }

      // If this is a retry, wait for the calculated delay
      if (retryCount > 0) {
        const delay = calculateBackoffDelay(retryCount - 1);
        logger.info('Waiting before retry', {
          meta: {
            paymentId,
            retryCount,
            delay
          }
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Attempt to get payment status from Razorpay
      if (payment.razorpayPaymentId) {
        const razorpayStatus = await getPaymentStatusFromRazorpay(
          payment.razorpayPaymentId,
          req,
          next
        );

        // Update local payment status based on Razorpay status
        let newStatus = payment.status;
        if (razorpayStatus.status === 'captured') {
          newStatus = EPaymentStatus.COMPLETED;
        } else if (razorpayStatus.status === 'failed') {
          newStatus = EPaymentStatus.FAILED;
        } else if (razorpayStatus.status === 'authorized') {
          newStatus = EPaymentStatus.PROCESSING;
        }

        if (newStatus !== payment.status) {
          await updatePaymentStatus(
            paymentId,
            newStatus,
            {
              metadata: {
                ...payment.metadata,
                lastRazorpayCheck: new Date(),
                razorpayStatus: razorpayStatus.status
              }
            },
            userId,
            requestContext,
            req,
            next
          );
        }

        // If payment is completed or definitively failed, return result
        if (newStatus === EPaymentStatus.COMPLETED || newStatus === EPaymentStatus.FAILED) {
          return {
            success: newStatus === EPaymentStatus.COMPLETED,
            payment: await paymentRepository.findPaymentById(paymentId),
            retryCount,
            finalStatus: newStatus
          };
        }
      }

      // If we reach here, payment is still pending/processing
      retryCount++;

      if (retryCount > maxRetries) {
        lastError = new Error('Maximum retry attempts reached');
        break;
      }
    }

    // All retries exhausted, mark payment as failed
    await updatePaymentStatus(
      paymentId,
      EPaymentStatus.FAILED,
      {
        failureReason: `Payment processing failed after ${maxRetries} retries: ${lastError?.message}`,
        metadata: {
          retryExhausted: true,
          lastError: lastError?.message,
          totalRetries: retryCount - 1
        }
      },
      userId,
      requestContext,
      req,
      next
    );

    return httpError(
      next,
      new Error(`Payment processing failed after ${maxRetries} retries`),
      req,
      500
    );
  }
);

export const refundPayment = asyncHandler(
  async (paymentId, amount, reason, correlationId, userId, requestContext = {}, req, next) => {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      return httpError(next, new Error('Payment not found'), req, 404);
    }

    if (payment.status !== EPaymentStatus.COMPLETED) {
      return httpError(next, new Error('Only completed payments can be refunded'), req, 400);
    }

    if (!payment.razorpayPaymentId) {
      return httpError(next, new Error('Razorpay payment ID not found'), req, 400);
    }

    // Calculate refund amount (default to full payment amount)
    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return httpError(next, new Error('Refund amount cannot exceed payment amount'), req, 400);
    }

    // Create refund in Razorpay
    const refundOptions = {
      amount: Math.round(refundAmount * 100), // Convert to paise
      notes: {
        correlationId,
        reason,
        originalPaymentId: paymentId
      }
    };

    const razorpayRefund = await razorpayInstance.payments.refund(
      payment.razorpayPaymentId,
      refundOptions
    );

    // Update payment status
    const updatedPayment = await updatePaymentStatus(
      paymentId,
      EPaymentStatus.REFUNDED,
      {
        metadata: {
          ...payment.metadata,
          refund: {
            razorpayRefundId: razorpayRefund.id,
            amount: refundAmount,
            reason,
            processedAt: new Date()
          }
        }
      },
      userId,
      requestContext,
      req,
      next
    );

    // Add refund audit entry using new audit system
    await auditUtils.auditPaymentOperation('refund', updatedPayment, {
      userId,
      correlationId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: req?.id,
      metadata: {
        razorpayRefundId: razorpayRefund.id,
        refundAmount,
        reason,
        originalAmount: payment.amount
      }
    });

    logger.info('Payment refunded successfully', {
      meta: {
        correlationId,
        paymentId,
        razorpayRefundId: razorpayRefund.id,
        refundAmount
      }
    });

    return {
      payment: updatedPayment,
      refund: razorpayRefund,
      refundAmount
    };
  }
);

export const cancelPayment = asyncHandler(
  async (paymentId, reason, correlationId, userId, requestContext = {}, req, next) => {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      return httpError(next, new Error('Payment not found'), req, 404);
    }

    if (![EPaymentStatus.PENDING, EPaymentStatus.PROCESSING].includes(payment.status)) {
      return httpError(
        next,
        new Error('Only pending or processing payments can be cancelled'),
        req,
        400
      );
    }

    // Update payment status to cancelled
    const updatedPayment = await updatePaymentStatus(
      paymentId,
      EPaymentStatus.CANCELLED,
      {
        failureReason: reason,
        metadata: {
          ...payment.metadata,
          cancellation: {
            reason,
            cancelledAt: new Date(),
            cancelledBy: userId
          }
        }
      },
      userId,
      requestContext,
      req,
      next
    );

    // Add cancellation audit entry using new audit system
    await auditUtils.auditPaymentOperation('cancel', updatedPayment, {
      userId,
      correlationId,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      requestId: req?.id,
      metadata: {
        reason,
        previousStatus: payment.status
      }
    });

    logger.info('Payment cancelled successfully', {
      meta: {
        correlationId,
        paymentId,
        reason
      }
    });

    return {
      payment: updatedPayment,
      cancelled: true,
      reason
    };
  }
);

export const batchUpdatePaymentStatuses = asyncHandler(async (paymentIds, userId, req, next) => {
  const results = {
    updated: [],
    failed: [],
    unchanged: []
  };

  for (const paymentId of paymentIds) {
    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment || !payment.razorpayPaymentId) {
      results.failed.push({ paymentId, reason: 'Payment not found or missing Razorpay ID' });
      continue;
    }

    // Skip if payment is already in final state
    if (
      [EPaymentStatus.COMPLETED, EPaymentStatus.REFUNDED, EPaymentStatus.CANCELLED].includes(
        payment.status
      )
    ) {
      results.unchanged.push({ paymentId, reason: 'Payment already in final state' });
      continue;
    }

    const razorpayStatus = await getPaymentStatusFromRazorpay(payment.razorpayPaymentId, req, next);

    let newStatus = payment.status;
    if (razorpayStatus.status === 'captured') {
      newStatus = EPaymentStatus.COMPLETED;
    } else if (razorpayStatus.status === 'failed') {
      newStatus = EPaymentStatus.FAILED;
    }

    if (newStatus !== payment.status) {
      await updatePaymentStatus(
        paymentId,
        newStatus,
        {
          metadata: {
            ...payment.metadata,
            batchUpdate: {
              updatedAt: new Date(),
              razorpayStatus: razorpayStatus.status
            }
          }
        },
        userId,
        {},
        req,
        next
      );

      results.updated.push({
        paymentId,
        previousStatus: payment.status,
        newStatus,
        razorpayStatus: razorpayStatus.status
      });
    } else {
      results.unchanged.push({ paymentId, reason: 'Status unchanged' });
    }
  }

  logger.info('Batch payment status update completed', {
    meta: {
      total: paymentIds.length,
      updated: results.updated.length,
      failed: results.failed.length,
      unchanged: results.unchanged.length
    }
  });

  return results;
});
