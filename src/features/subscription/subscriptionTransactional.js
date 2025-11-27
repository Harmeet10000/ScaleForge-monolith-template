import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import asyncHandler from 'express-async-handler';
import { executeInTransaction } from '../../utils/transactionManager.js';
import * as subscriptionRepository from './subscriptionRepository.js';
import * as paymentRepository from '../payments/paymentRepository.js';
import { EPaymentStatus } from '../payments/paymentConstants.js';

/**
 * ===== TRANSACTIONAL SUBSCRIPTION OPERATIONS =====
 * These methods use MongoDB ACID transactions for atomic updates
 * Added as extension to subscriptionService.js
 */

/**
 * Renew a subscription atomically
 * Updates subscription status, next billing date, and creates payment order in one transaction
 *
 * @param {string} subscriptionId - Subscription to renew
 * @param {string} correlationId - Correlation ID for tracing
 * @param {string} userId - User ID performing action
 * @param {Object} requestContext - Request context (IP, user agent)
 * @param {Object} session - Optional existing MongoDB session
 * @returns {Promise<{subscription, paymentOrder}>} Renewed subscription and created payment order
 */
export const renewSubscription = asyncHandler(
  async (subscriptionId, correlationId, userId, requestContext = {}, session = null) => {
    await executeInTransaction(
      async (txSession) => {
        // Find subscription
        const subscription = await subscriptionRepository.findSubscriptionById(
          subscriptionId,
          {},
          txSession
        );

        if (!subscription) {
          throw new httpError('Subscription not found', 404);
        }

        if (subscription.status !== 'active' && subscription.status !== 'expired') {
          throw new Error(`Cannot renew subscription with status: ${subscription.status}`);
        }

        // Calculate new billing dates based on billing cycle
        const now = new Date();
        const currentEnd = subscription.currentPeriodEnd || now;
        const nextPeriodEnd = new Date(currentEnd);
        const monthsToAdd =
          subscription.billingCycle === 'quarterly'
            ? 3
            : subscription.billingCycle === 'annual'
              ? 12
              : 1;
        nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + monthsToAdd);

        const billingDates = {
          periodStart: currentEnd,
          periodEnd: nextPeriodEnd,
          nextBilling: currentEnd
        }; // Update subscription with new billing dates
        const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
          subscriptionId,
          {
            status: 'active',
            currentPeriodStart: billingDates.periodStart,
            currentPeriodEnd: billingDates.periodEnd,
            nextBillingDate: billingDates.nextBilling
          },
          txSession
        );

        // Create renewal payment order
        const paymentData = {
          customerId: subscription.customerId,
          subscriptionId: subscription._id,
          amount: subscription.amount,
          currency: subscription.currency,
          metadata: {
            renewalType: 'subscription_renewal',
            planId: subscription.planId,
            billingCycle: subscription.billingCycle
          }
        };

        const paymentIdempotencyKey = `${correlationId}_renewal_${subscriptionId}`;
        // Generate simple hash from idempotency key
        const paymentRequestHash = Buffer.from(paymentIdempotencyKey).toString('base64');

        const paymentOrder = await paymentRepository.createPaymentWithIdempotency(
          {
            ...paymentData,
            correlationId,
            status: EPaymentStatus.PENDING
          },
          paymentIdempotencyKey,
          paymentRequestHash,
          txSession
        );

        // Add audit entry for subscription renewal
        await subscriptionRepository.addSubscriptionAuditEntry(
          subscriptionId,
          'Subscription renewed',
          'subscription_renewed',
          userId,
          {
            renewalPaymentId: paymentOrder._id,
            newBillingDates: billingDates
          },
          requestContext.ipAddress,
          requestContext.userAgent,
          'success',
          null,
          txSession
        );

        logger.info('Subscription renewed successfully in transaction', {
          meta: {
            correlationId,
            subscriptionId,
            paymentId: paymentOrder._id,
            newNextBillingDate: billingDates.nextBilling
          }
        });

        return { subscription: updatedSubscription, paymentOrder };
      },
      {
        session,
        transactionName: `renew_subscription_${correlationId}`,
        transactionType: 'SUBSCRIPTION_RENEWAL',
        correlationId
      }
    );
  }
);

/**
 * Update subscription status atomically
 * Updates status, timestamps, and creates audit entry in single transaction
 *
 * @param {string} subscriptionId - Subscription to update
 * @param {string} newStatus - New status (active, cancelled, suspended, expired)
 * @param {Object} metadata - Additional update data
 * @param {string} userId - User ID performing action
 * @param {Object} requestContext - Request context
 * @param {Object} session - Optional existing MongoDB session
 * @returns {Promise<Object>} Updated subscription
 */
export const updateSubscriptionStatus = asyncHandler(
  async (subscriptionId, newStatus, metadata = {}, userId, requestContext = {}, session = null) => {
    await executeInTransaction(
      async (txSession) => {
        const subscription = await subscriptionRepository.findSubscriptionById(
          subscriptionId,
          {},
          txSession
        );

        if (!subscription) {
          throw new httpError('Subscription not found', 404);
        }

        const statusUpdate = { status: newStatus, ...metadata };

        // Add status-specific timestamps
        if (newStatus === 'cancelled') {
          statusUpdate.cancelledAt = new Date();
        } else if (newStatus === 'suspended') {
          statusUpdate.suspendedAt = new Date();
        } else if (newStatus === 'active') {
          statusUpdate.suspendedAt = null;
        } else if (newStatus === 'expired') {
          statusUpdate.expiredAt = new Date();
        }

        // Update subscription
        const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
          subscriptionId,
          statusUpdate,
          txSession
        );

        // Add audit entry
        await subscriptionRepository.addSubscriptionAuditEntry(
          subscriptionId,
          `Subscription status changed to ${newStatus}`,
          `subscription_${newStatus}`,
          userId,
          { previousStatus: subscription.status, metadata },
          requestContext.ipAddress,
          requestContext.userAgent,
          'success',
          null,
          txSession
        );

        logger.info('Subscription status updated in transaction', {
          meta: {
            subscriptionId,
            previousStatus: subscription.status,
            newStatus,
            userId
          }
        });

        return updatedSubscription;
      },
      {
        session,
        transactionName: `update_subscription_status_${subscriptionId}_${newStatus}`,
        transactionType: 'DEFAULT',
        correlationId: null
      }
    );
  }
);

/**
 * Handle subscription expiry with atomic update
 * Marks subscription as expired and triggers downstream actions
 *
 * @param {string} subscriptionId - Subscription to expire
 * @param {string} userId - User ID performing action
 * @param {Object} requestContext - Request context
 * @returns {Promise<Object>} Updated subscription
 */
export const handleSubscriptionExpiry = asyncHandler(
  async (subscriptionId, userId, requestContext = {}) => {
    await updateSubscriptionStatus(
      subscriptionId,
      'expired',
      { expiryReason: 'Automatic expiry after billing period' },
      userId,
      requestContext,
      null
    );
  }
);

/**
 * Suspend subscription due to failed payment with atomic update
 *
 * @param {string} subscriptionId - Subscription to suspend
 * @param {string} suspensionReason - Reason for suspension
 * @param {string} userId - User ID
 * @param {Object} requestContext - Request context
 * @returns {Promise<Object>} Updated subscription
 */
export const suspendSubscriptionForPaymentFailure = asyncHandler(
  async (subscriptionId, suspensionReason, userId, requestContext = {}) => {
    await updateSubscriptionStatus(
      subscriptionId,
      'suspended',
      { suspensionReason },
      userId,
      requestContext,
      null
    );
  }
);
