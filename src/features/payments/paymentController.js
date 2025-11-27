import { httpError } from '../../utils/httpError.js';
import {
  validateCheckout,
  validatePaymentVerification,
  validatePaymentHistory,
  validatePaymentId,
  validateRefund
} from './paymentValidation.js';
import * as paymentService from './paymentService.js';
import * as paymentRepository from './paymentRepository.js';
import * as webhookService from './webhookService.js';
import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import { executeInTransaction } from '../../utils/transactionManager.js';
import { logger } from '../../utils/logger.js';

export const checkout = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateCheckout, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const paymentData = {
    ...value,
    customerId: req.user._id
  };

  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await paymentService.createPayment(
    paymentData,
    req.correlationId,
    req.user._id,
    requestContext,
    req,
    next
  );

  if (result.isIdempotent) {
    return httpResponse(req, res, 200, 'Idempotent request processed', {
      paymentId: result.payment.paymentId,
      razorpayOrderId: result.payment.razorpayOrderId,
      amount: result.payment.amount,
      currency: result.payment.currency,
      idempotent: true
    });
  }

  httpResponse(req, res, 200, 'Payment order created successfully', {
    paymentId: result.payment.paymentId,
    razorpayOrderId: result.razorpayOrder.id,
    amount: result.payment.amount,
    currency: result.payment.currency
  });
});

export const paymentVerification = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validatePaymentVerification, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  // For verification, we might not have user context, so we'll use a system user ID
  const userId = req.user?.id || 'system';

  const result = await paymentService.verifyPayment(
    value,
    req.correlationId,
    userId,
    requestContext,
    req,
    next
  );

  if (result.verified) {
    // For API responses (not redirects)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return httpResponse(req, res, 200, 'Payment verified successfully', {
        paymentId: result.payment.paymentId,
        status: result.payment.status,
        razorpayPaymentId: value.razorpay_payment_id
      });
    }

    // Redirect for web payments
    res.redirect(
      `${process.env.FRONTEND_URL}/payment-success?payment_id=${value.razorpay_payment_id}&correlation_id=${req.correlationId}`
    );
  }
});

export const getPaymentHistoryController = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validatePaymentHistory, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const payments = await paymentService.getPaymentsByCustomer(req.user._id, value, req, next);

  // Calculate pagination info (this would need to be enhanced with actual count)
  const totalRecords = payments.length;
  const totalPages = Math.ceil(totalRecords / value.limit);
  const hasNextPage = value.page < totalPages;
  const hasPrevPage = value.page > 1;

  const result = {
    payments,
    pagination: {
      currentPage: value.page,
      totalPages,
      totalRecords,
      hasNextPage,
      hasPrevPage
    }
  };

  httpResponse(req, res, 200, 'Payment history retrieved successfully', result);
});

export const getPaymentStatusController = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validatePaymentId, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const payment = await paymentRepository.findPaymentById(value.paymentId);

  if (!payment) {
    return httpError(next, new Error('Payment not found'), req, 404);
  }

  // Check if user owns this payment
  if (payment.customerId.toString() !== req.user._id) {
    return httpError(next, new Error('Unauthorized access to payment'), req, 403);
  }

  const result = {
    paymentId: payment.paymentId,
    status: payment.status,
    amount: payment.amount,
    currency: payment.currency,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    razorpayPaymentId: payment.razorpayPaymentId,
    description: payment.description
  };

  httpResponse(req, res, 200, 'Payment status retrieved successfully', result);
});

export const processRefundController = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateRefund, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await paymentService.refundPayment(
    value.paymentId,
    value.amount,
    value.reason || 'Customer requested refund',
    req.correlationId,
    req.user.id,
    requestContext,
    req,
    next
  );

  httpResponse(req, res, 200, 'Refund processed successfully', {
    refundId: result.refund.id,
    paymentId: result.payment.paymentId,
    amount: result.refundAmount,
    status: result.payment.status
  });
});

export const retryPaymentController = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validatePaymentId, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const requestContext = {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent')
  };

  const result = await paymentService.retryFailedPayment(
    value.paymentId,
    req.user.id,
    requestContext,
    req,
    next
  );

  httpResponse(req, res, 200, 'Payment retry initiated successfully', {
    paymentId: result.payment.paymentId,
    status: result.payment.status,
    retryCount: result.retryCount,
    nextRetryAt: result.nextRetryAt
  });
});

export const getRazorpayKey = asyncHandler(async (req, res) => {
  const result = {
    key: process.env.RAZORPAY_KEY_ID
  };
  httpResponse(req, res, 200, 'Razorpay API key retrieved', result);
});

/**
 * Handle Razorpay webhooks
 * Verifies signature, processes event atomically, acknowledges webhook
 *
 * POST /api/v1/payments/webhooks/razorpay
 * Headers: x-razorpay-signature
 * Body: { event: string, created_at: number, contains: string[], payload: {...} }
 */
export const handleRazorpayWebhook = asyncHandler(async (req, res, _next) => {
  const signature = req.headers['x-razorpay-signature'];
  const correlationId = req.correlationId || `webhook_${Date.now()}`;

  logger.debug('Webhook received', {
    meta: { correlationId, event: req.body?.event }
  });

  // Verify webhook signature
  const isValid = webhookService.verifyWebhookSignature(req.rawBody || req.body, signature);
  if (!isValid) {
    logger.warn('Invalid Razorpay webhook signature', {
      meta: { correlationId, timestamp: new Date().toISOString() }
    });

    // Still return 200 to prevent webhook retries, but don't process
    return res.status(200).json({
      success: false,
      error: 'Invalid signature',
      correlationId
    });
  }

  const { event, payload } = req.body;

  try {
    // Process webhook in transaction
    const result = await executeInTransaction(
      async (session) => {
        const webhookResult = await webhookService.processWebhookEvent(
          event,
          payload,
          correlationId,
          session
        );

        // Log webhook processing
        logger.info('Webhook processed in transaction', {
          meta: {
            event,
            correlationId,
            processed: webhookResult.processed
          }
        });

        return webhookResult;
      },
      {
        transactionName: `webhook_${event}_${correlationId}`,
        transactionType: 'WEBHOOK',
        correlationId
      }
    );

    logger.info('Webhook processed successfully', {
      meta: { event, correlationId, result: result.processed }
    });

    // Always return 200 to acknowledge webhook (idempotency)
    return res.status(200).json({
      success: true,
      correlationId,
      processed: result.processed
    });
  } catch (error) {
    logger.error('Webhook processing failed', {
      meta: {
        event,
        correlationId,
        error: error.message
      }
    });

    // Still return 200 to acknowledge, but log failure
    return res.status(200).json({
      success: false,
      error: error.message,
      correlationId
    });
  }
});
