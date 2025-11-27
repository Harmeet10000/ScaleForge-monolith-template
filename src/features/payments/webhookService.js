import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import { logger } from '../../utils/logger.js';
import { EPaymentStatus } from './paymentConstants.js';
import * as paymentRepository from './paymentRepository.js';
import * as subscriptionRepository from '../subscription/subscriptionRepository.js';

const { RAZORPAY_WEBHOOK_SECRET } = process.env;

/**
 * Verify Razorpay webhook signature
 * CRITICAL: Must use raw request body, not parsed JSON
 * @param {string} rawBody - Raw request body as string/buffer
 * @param {string} signature - x-razorpay-signature header value
 * @returns {boolean} True if signature is valid
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  if (!RAZORPAY_WEBHOOK_SECRET) {
    logger.error('RAZORPAY_WEBHOOK_SECRET not configured', {
      meta: { source: 'webhook_verification' }
    });
    return false;
  }

  try {
    const body = typeof rawBody === 'string' ? rawBody : rawBody.toString();
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  } catch (error) {
    logger.error('Webhook signature verification error', {
      meta: { error: error.message, source: 'webhook_verification' }
    });
    return false;
  }
};

/**
 * Process Razorpay webhook event
 * Routes to specific handlers based on event type
 * @param {string} event - Event type (e.g., 'payment.captured')
 * @param {Object} payload - Event payload
 * @param {string} correlationId - Correlation ID for tracing
 * @param {mongoose.ClientSession} session - Transactional session
 * @returns {Promise<Object>} Processing result
 */
export const processWebhookEvent = asyncHandler(async (event, payload, correlationId, session) => {
  logger.debug(`Processing webhook event: ${event}`, {
    meta: { event, correlationId }
  });

  switch (event) {
    case 'payment.authorized':
      return await handlePaymentAuthorized(payload, correlationId, session);

    case 'payment.captured':
      return await handlePaymentCaptured(payload, correlationId, session);

    case 'payment.failed':
      return await handlePaymentFailed(payload, correlationId, session);

    case 'payment.refunded':
      return await handlePaymentRefunded(payload, correlationId, session);

    case 'subscription.completed':
      return await handleSubscriptionCompleted(payload, correlationId, session);

    case 'subscription.halted':
      return await handleSubscriptionHalted(payload, correlationId, session);

    default:
      logger.warn(`Unknown webhook event type: ${event}`, {
        meta: { event, correlationId }
      });
      return { processed: false, reason: 'Unknown event type' };
  }
});

/**
 * Handle payment.authorized event
 * Updates payment status to processing
 */
const handlePaymentAuthorized = asyncHandler(async (payload, correlationId, session) => {
  const { payment } = payload;
  const { id: razorpayPaymentId, order_id: razorpayOrderId, amount, currency } = payment;

  logger.info('Processing payment.authorized event', {
    meta: { correlationId, razorpayPaymentId, razorpayOrderId }
  });

  // Find payment by Razorpay order ID
  const paymentDoc = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId, session);

  if (!paymentDoc) {
    logger.warn('Payment not found for authorized webhook', {
      meta: { correlationId, razorpayOrderId }
    });
    return { processed: false, reason: 'Payment not found' };
  }

  // Update payment status to processing
  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentDoc._id,
    EPaymentStatus.PROCESSING,
    {
      razorpayPaymentId,
      authorizedAt: new Date()
    },
    session
  );

  // Add audit entry
  await paymentRepository.addPaymentAuditEntry(
    paymentDoc._id,
    'Payment authorized via webhook',
    'payment_authorized_webhook',
    null,
    { razorpayPaymentId, amount, currency },
    'webhook',
    'razorpay-webhook',
    'success',
    null,
    session
  );

  logger.info('Payment authorized successfully', {
    meta: { correlationId, paymentId: paymentDoc._id, razorpayPaymentId }
  });

  return { processed: true, payment: updatedPayment, status: 'authorized' };
});

/**
 * Handle payment.captured event
 * Updates payment status to completed and activates subscription
 */
const handlePaymentCaptured = asyncHandler(async (payload, correlationId, session) => {
  const { payment } = payload;
  const { id: razorpayPaymentId, order_id: razorpayOrderId, amount, currency } = payment;

  logger.info('Processing payment.captured event', {
    meta: { correlationId, razorpayPaymentId, razorpayOrderId }
  });

  // Find payment
  const paymentDoc = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId, session);

  if (!paymentDoc) {
    logger.warn('Payment not found for captured webhook', {
      meta: { correlationId, razorpayOrderId }
    });
    return { processed: false, reason: 'Payment not found' };
  }

  // Update payment status to completed
  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentDoc._id,
    EPaymentStatus.COMPLETED,
    {
      razorpayPaymentId,
      completedAt: new Date()
    },
    session
  );

  // Update linked subscription if exists
  let updatedSubscription = null;
  if (paymentDoc.subscriptionId) {
    updatedSubscription = await subscriptionRepository.updateSubscriptionStatus(
      paymentDoc.subscriptionId,
      'active',
      {
        nextBillingDate: calculateNextBillingDate(paymentDoc)
      },
      session
    );

    logger.debug('Subscription activated for captured payment', {
      meta: { correlationId, subscriptionId: paymentDoc.subscriptionId }
    });
  }

  // Add audit entry
  await paymentRepository.addPaymentAuditEntry(
    paymentDoc._id,
    'Payment captured via webhook',
    'payment_captured_webhook',
    null,
    { razorpayPaymentId, amount, currency },
    'webhook',
    'razorpay-webhook',
    'success',
    null,
    session
  );

  logger.info('Payment captured successfully', {
    meta: { correlationId, paymentId: paymentDoc._id, razorpayPaymentId }
  });

  return {
    processed: true,
    payment: updatedPayment,
    subscription: updatedSubscription,
    status: 'captured'
  };
});

/**
 * Handle payment.failed event
 * Updates payment status to failed and suspends subscription
 */
const handlePaymentFailed = asyncHandler(async (payload, correlationId, session) => {
  const { payment } = payload;
  const {
    id: razorpayPaymentId,
    order_id: razorpayOrderId,
    error_code,
    error_description
  } = payment;

  logger.warn('Processing payment.failed event', {
    meta: { correlationId, razorpayOrderId, errorCode: error_code }
  });

  // Find payment
  const paymentDoc = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId, session);

  if (!paymentDoc) {
    logger.warn('Payment not found for failed webhook', {
      meta: { correlationId, razorpayOrderId }
    });
    return { processed: false, reason: 'Payment not found' };
  }

  // Update payment status to failed
  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentDoc._id,
    EPaymentStatus.FAILED,
    {
      razorpayPaymentId,
      failureReason: error_description,
      failedAt: new Date()
    },
    session
  );

  // Suspend linked subscription if exists
  let updatedSubscription = null;
  if (paymentDoc.subscriptionId) {
    updatedSubscription = await subscriptionRepository.updateSubscriptionStatus(
      paymentDoc.subscriptionId,
      'suspended',
      {
        suspensionReason: `Payment failed: ${error_description}`
      },
      session
    );

    logger.info('Subscription suspended due to payment failure', {
      meta: { correlationId, subscriptionId: paymentDoc.subscriptionId }
    });
  }

  // Add audit entry
  await paymentRepository.addPaymentAuditEntry(
    paymentDoc._id,
    `Payment failed via webhook: ${error_description}`,
    'payment_failed_webhook',
    null,
    { razorpayPaymentId, errorCode: error_code, errorDescription: error_description },
    'webhook',
    'razorpay-webhook',
    'failed',
    error_description,
    session
  );

  logger.warn('Payment failed webhook processed', {
    meta: { correlationId, paymentId: paymentDoc._id, errorCode: error_code }
  });

  return {
    processed: true,
    payment: updatedPayment,
    subscription: updatedSubscription,
    status: 'failed'
  };
});

/**
 * Handle payment.refunded event
 * Updates payment status to refunded
 */
const handlePaymentRefunded = asyncHandler(async (payload, correlationId, session) => {
  const { payment } = payload;
  const { id: razorpayPaymentId, order_id: razorpayOrderId, amount, currency } = payment;

  logger.info('Processing payment.refunded event', {
    meta: { correlationId, razorpayPaymentId, razorpayOrderId, amount }
  });

  // Find payment
  const paymentDoc = await paymentRepository.findPaymentByRazorpayOrderId(razorpayOrderId, session);

  if (!paymentDoc) {
    logger.warn('Payment not found for refunded webhook', {
      meta: { correlationId, razorpayOrderId }
    });
    return { processed: false, reason: 'Payment not found' };
  }

  // Update payment status to refunded
  const updatedPayment = await paymentRepository.updatePaymentStatus(
    paymentDoc._id,
    EPaymentStatus.REFUNDED,
    {
      razorpayPaymentId,
      refundedAmount: amount,
      refundedAt: new Date()
    },
    session
  );

  // Add audit entry
  await paymentRepository.addPaymentAuditEntry(
    paymentDoc._id,
    'Payment refunded via webhook',
    'payment_refunded_webhook',
    null,
    { razorpayPaymentId, refundedAmount: amount, currency },
    'webhook',
    'razorpay-webhook',
    'success',
    null,
    session
  );

  logger.info('Payment refunded successfully', {
    meta: { correlationId, paymentId: paymentDoc._id, refundedAmount: amount }
  });

  return { processed: true, payment: updatedPayment, status: 'refunded' };
});

/**
 * Handle subscription.completed event
 * Updates subscription status to expired
 */
const handleSubscriptionCompleted = asyncHandler(async (payload, correlationId, _session) => {
  const { subscription } = payload;
  const { id: razorpaySubscriptionId } = subscription;

  logger.info('Processing subscription.completed event', {
    meta: { correlationId, razorpaySubscriptionId }
  });

  // Note: This is a simplified handler
  // In production, you'd need to find subscription by Razorpay ID
  logger.warn('Subscription completion webhook received but matching not implemented', {
    meta: { correlationId, razorpaySubscriptionId }
  });

  return { processed: false, reason: 'Subscription matching not implemented' };
});

/**
 * Handle subscription.halted event
 * Suspends subscription
 */
const handleSubscriptionHalted = asyncHandler(async (payload, correlationId, _session) => {
  const { subscription } = payload;
  const { id: razorpaySubscriptionId, customer_id: customerId } = subscription;

  logger.warn('Processing subscription.halted event', {
    meta: { correlationId, razorpaySubscriptionId, customerId }
  });

  // Note: This is a simplified handler
  // In production, you'd need to find subscription by Razorpay ID
  logger.warn('Subscription halted webhook received but matching not implemented', {
    meta: { correlationId, razorpaySubscriptionId }
  });

  return { processed: false, reason: 'Subscription matching not implemented' };
});

/**
 * Calculate next billing date based on billing cycle
 * @param {Object} payment - Payment document
 * @returns {Date} Next billing date
 */
const calculateNextBillingDate = (payment) => {
  if (!payment.subscriptionId) {
    return null;
  }

  // This is a placeholder - actual logic would use subscription billing cycle
  const nextDate = new Date();
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
};

export default {
  verifyWebhookSignature,
  processWebhookEvent
};
