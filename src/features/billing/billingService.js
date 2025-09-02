import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import * as subscriptionRepository from '../subscription/subscriptionRepository.js';
import * as paymentRepository from '../payments/paymentRepository.js';
import { BillingProfile } from './billingProfileModel.js';

const generateInvoiceNumber = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `INV-${timestamp}-${random}`.toUpperCase();
};

const generateIdempotencyKey = (correlationId, operationType) => {
  `${correlationId}_${operationType}`;
};

const generateRequestHash = (data) => {
  const hashData = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(hashData).digest('hex');
};

const calculateTaxAmount = (amount, taxRate = 0.18) => Math.round(amount * taxRate * 100) / 100;

const calculateProrationAmount = (subscription, changes) => {
  const now = new Date();
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.ceil((periodEnd - now) / (1000 * 60 * 60 * 24));

  if (remainingDays <= 0) {
    return {
      totalPeriodDays,
      remainingDays: 0,
      prorationAmount: 0,
      calculatedAt: now
    };
  }

  const currentDailyRate = subscription.amount / totalPeriodDays;
  const newDailyRate = changes.amount / totalPeriodDays;
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

const calculateRefundAmount = (subscription, cancellationDate = new Date()) => {
  const periodStart = subscription.currentPeriodStart;
  const periodEnd = subscription.currentPeriodEnd;

  const totalPeriodDays = Math.ceil((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
  const usedDays = Math.ceil((cancellationDate - periodStart) / (1000 * 60 * 60 * 24));
  const remainingDays = Math.max(0, totalPeriodDays - usedDays);

  const dailyRate = subscription.amount / totalPeriodDays;
  const refundAmount = dailyRate * remainingDays;

  return {
    totalPeriodDays,
    usedDays,
    remainingDays,
    dailyRate,
    refundAmount: Math.max(0, refundAmount),
    calculatedAt: cancellationDate
  };
};

export const generateInvoice = asyncHandler(
  async (
    subscriptionId,
    correlationId,
    userId,
    invoiceData = {},
    requestContext = {},
    next,
    req
  ) => {
    const idempotencyKey = generateIdempotencyKey(correlationId, 'invoice_generate');
    const requestHash = generateRequestHash({ subscriptionId, ...invoiceData });

    // Check for existing invoice with same idempotency key
    const existingInvoice = await paymentRepository.findPaymentByIdempotencyKey(idempotencyKey);
    if (existingInvoice && existingInvoice.metadata?.invoiceData) {
      logger.info('Returning existing invoice due to idempotency', {
        meta: {
          correlationId,
          invoiceId: existingInvoice.paymentId,
          subscriptionId,
          isIdempotent: true
        }
      });
      return {
        invoice: existingInvoice,
        isIdempotent: true
      };
    }

    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    const billingProfile = await BillingProfile.findByCustomer(subscription.customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const invoiceNumber = generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = new Date(
      issueDate.getTime() + (invoiceData.dueDays || 30) * 24 * 60 * 60 * 1000
    );

    // Calculate amounts
    const subtotal = subscription.amount;
    const taxAmount = calculateTaxAmount(subtotal, billingProfile.taxInformation?.taxRate || 0.18);
    const total = subtotal + taxAmount;

    // Apply credit balance if available
    const creditApplied = Math.min(billingProfile.creditBalance || 0, total);
    const amountDue = total - creditApplied;

    const invoicePayload = {
      paymentId: crypto.randomUUID(),
      correlationId,
      customerId: subscription.customerId,
      subscriptionId: subscription._id,
      amount: amountDue,
      currency: subscription.currency,
      status: amountDue > 0 ? 'pending' : 'completed',
      metadata: {
        invoiceData: {
          invoiceNumber,
          issueDate,
          dueDate,
          subtotal,
          taxAmount,
          creditApplied,
          total,
          amountDue,
          billingPeriod: {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd
          },
          lineItems: [
            {
              description: `${subscription.planName} - ${subscription.billingCycle}`,
              quantity: 1,
              unitPrice: subscription.amount,
              amount: subscription.amount,
              period: {
                start: subscription.currentPeriodStart,
                end: subscription.currentPeriodEnd
              }
            }
          ],
          billingAddress: billingProfile.billingAddress,
          taxInformation: billingProfile.taxInformation,
          paymentTerms: invoiceData.paymentTerms || 'Net 30'
        },
        correlationId,
        createdBy: userId,
        creationContext: requestContext
      }
    };

    const invoice = await paymentRepository.createPaymentWithIdempotency(
      invoicePayload,
      idempotencyKey,
      requestHash
    );

    // Update billing profile credit balance if credit was applied
    if (creditApplied > 0) {
      await billingProfile.deductCredit(creditApplied);
      await billingProfile.addAuditEntry(
        'Credit applied to invoice',
        'billing_profile_update',
        userId,
        {
          before: { creditBalance: billingProfile.creditBalance + creditApplied },
          after: { creditBalance: billingProfile.creditBalance },
          operationData: { invoiceId: invoice.paymentId, creditApplied }
        },
        requestContext.ipAddress,
        requestContext.userAgent,
        'success'
      );
    }

    logger.info('Invoice generated successfully', {
      meta: {
        correlationId,
        invoiceId: invoice.paymentId,
        invoiceNumber,
        subscriptionId,
        customerId: subscription.customerId,
        subtotal,
        taxAmount,
        creditApplied,
        amountDue
      }
    });

    return {
      invoice,
      isIdempotent: false
    };
  }
);

export const generateProrationInvoice = asyncHandler(
  async (subscriptionId, changes, correlationId, userId, requestContext = {}, next, req) => {
    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      return httpError(next, new Error('Subscription not found'), req, 404);
    }

    const billingProfile = await BillingProfile.findByCustomer(subscription.customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const prorationData = calculateProrationAmount(subscription, changes);

    if (prorationData.prorationAmount === 0) {
      logger.info('No proration required', {
        meta: {
          correlationId,
          subscriptionId,
          remainingDays: prorationData.remainingDays
        }
      });
      return null;
    }

    const invoiceNumber = generateInvoiceNumber();
    const issueDate = new Date();
    const dueDate = new Date(issueDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days for proration

    const isCredit = prorationData.prorationAmount < 0;
    const absoluteAmount = Math.abs(prorationData.prorationAmount);
    const taxAmount = calculateTaxAmount(
      absoluteAmount,
      billingProfile.taxInformation?.taxRate || 0.18
    );
    const total = absoluteAmount + taxAmount;

    const invoicePayload = {
      paymentId: crypto.randomUUID(),
      correlationId,
      customerId: subscription.customerId,
      subscriptionId: subscription._id,
      amount: isCredit ? -total : total,
      currency: subscription.currency,
      status: isCredit ? 'completed' : 'pending',
      metadata: {
        invoiceData: {
          invoiceNumber,
          issueDate,
          dueDate,
          subtotal: isCredit ? -absoluteAmount : absoluteAmount,
          taxAmount: isCredit ? -taxAmount : taxAmount,
          total: isCredit ? -total : total,
          amountDue: isCredit ? 0 : total,
          type: isCredit ? 'credit_note' : 'proration_invoice',
          prorationDetails: prorationData,
          lineItems: [
            {
              description: `Plan change proration: ${subscription.planName} → ${changes.planName || subscription.planName}`,
              quantity: 1,
              unitPrice: prorationData.prorationAmount,
              amount: prorationData.prorationAmount,
              period: {
                start: new Date(),
                end: subscription.currentPeriodEnd
              },
              prorationDetails: {
                remainingDays: prorationData.remainingDays,
                oldDailyRate: prorationData.currentDailyRate,
                newDailyRate: prorationData.newDailyRate
              }
            }
          ],
          billingAddress: billingProfile.billingAddress,
          taxInformation: billingProfile.taxInformation
        },
        correlationId,
        createdBy: userId,
        creationContext: requestContext
      }
    };

    const invoice = await paymentRepository.createPayment(invoicePayload);

    // If it's a credit, add to customer's credit balance
    if (isCredit) {
      await billingProfile.addCredit(total);
      await billingProfile.addAuditEntry(
        'Credit added from proration',
        'billing_profile_update',
        userId,
        {
          before: { creditBalance: billingProfile.creditBalance - total },
          after: { creditBalance: billingProfile.creditBalance },
          operationData: { invoiceId: invoice.paymentId, creditAmount: total }
        },
        requestContext.ipAddress,
        requestContext.userAgent,
        'success'
      );
    }

    logger.info('Proration invoice generated successfully', {
      meta: {
        correlationId,
        invoiceId: invoice.paymentId,
        invoiceNumber,
        subscriptionId,
        prorationAmount: prorationData.prorationAmount,
        isCredit,
        total
      }
    });

    return invoice;
  }
);

export const processRecurringBilling = asyncHandler(async (correlationId, userId, options = {}) => {
  const { bufferHours = 24, dryRun = false } = options;

  const dueSubscriptions = await subscriptionRepository.findSubscriptionsDueForRenewal(bufferHours);

  const results = {
    total: dueSubscriptions.length,
    processed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  if (dryRun) {
    logger.info('Dry run mode - no actual billing processed', {
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
      status: 'would_bill'
    }));

    return results;
  }

  for (const subscription of dueSubscriptions) {
    try {
      // Generate invoice for the subscription
      const invoiceResult = await generateInvoice(
        subscription.subscriptionId,
        correlationId,
        userId,
        { dueDays: 7 }, // Shorter due date for recurring billing
        { source: 'recurring_billing' }
      );

      if (invoiceResult.isIdempotent) {
        results.skipped++;
        results.details.push({
          subscriptionId: subscription.subscriptionId,
          customerId: subscription.customerId,
          status: 'skipped_idempotent',
          invoiceId: invoiceResult.invoice.paymentId
        });
        continue;
      }

      results.processed++;
      results.details.push({
        subscriptionId: subscription.subscriptionId,
        customerId: subscription.customerId,
        status: 'billed',
        invoiceId: invoiceResult.invoice.paymentId,
        amount: invoiceResult.invoice.amount
      });
    } catch (error) {
      results.failed++;
      results.details.push({
        subscriptionId: subscription.subscriptionId,
        customerId: subscription.customerId,
        status: 'failed',
        error: error.message
      });

      logger.error('Failed to process recurring billing', {
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

  logger.info('Completed recurring billing processing', {
    meta: {
      correlationId,
      results: {
        total: results.total,
        processed: results.processed,
        failed: results.failed,
        skipped: results.skipped
      },
      bufferHours
    }
  });

  return results;
});

export const createBillingProfile = asyncHandler(
  async (customerId, profileData, correlationId, userId, requestContext = {}, next, req) => {
    const existingProfile = await BillingProfile.findByCustomer(customerId);
    if (existingProfile) {
      return httpError(
        next,
        new Error('Billing profile already exists for this customer'),
        req,
        409
      );
    }

    const billingProfile = await BillingProfile.createProfile(customerId, {
      billingAddress: profileData.billingAddress,
      taxInformation: profileData.taxInformation,
      preferences: profileData.preferences,
      metadata: {
        correlationId,
        createdBy: userId,
        creationContext: requestContext
      }
    });

    await billingProfile.addAuditEntry(
      'Billing profile created',
      'billing_profile_create',
      userId,
      {
        before: null,
        after: billingProfile.toObject(),
        operationData: { correlationId }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Billing profile created successfully', {
      meta: {
        correlationId,
        customerId,
        billingProfileId: billingProfile._id
      }
    });

    return billingProfile;
  }
);

export const updateBillingProfile = asyncHandler(
  async (customerId, updates, correlationId, userId, requestContext = {}, next, req) => {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const originalState = billingProfile.toObject();

    if (updates.billingAddress) {
      await billingProfile.updateBillingAddress(updates.billingAddress);
    }

    if (updates.taxInformation) {
      await billingProfile.updateTaxInformation(updates.taxInformation);
    }

    if (updates.preferences) {
      await billingProfile.updatePreferences(updates.preferences);
    }

    await billingProfile.addAuditEntry(
      'Billing profile updated',
      'billing_profile_update',
      userId,
      {
        before: originalState,
        after: billingProfile.toObject(),
        operationData: { correlationId, updates }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Billing profile updated successfully', {
      meta: {
        correlationId,
        customerId,
        updatedFields: Object.keys(updates)
      }
    });

    return billingProfile;
  }
);

export const addPaymentMethod = asyncHandler(
  async (customerId, paymentMethodData, correlationId, userId, requestContext = {}, next, req) => {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const originalState = billingProfile.toObject();

    await billingProfile.addPaymentMethod(paymentMethodData);

    await billingProfile.addAuditEntry(
      'Payment method added',
      'payment_method_add',
      userId,
      {
        before: originalState,
        after: billingProfile.toObject(),
        operationData: { correlationId, methodId: paymentMethodData.methodId }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Payment method added successfully', {
      meta: {
        correlationId,
        customerId,
        methodId: paymentMethodData.methodId,
        methodType: paymentMethodData.type
      }
    });

    return billingProfile;
  }
);

export const removePaymentMethod = asyncHandler(
  async (customerId, methodId, correlationId, userId, requestContext = {}, next, req) => {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const originalState = billingProfile.toObject();

    await billingProfile.removePaymentMethod(methodId);

    await billingProfile.addAuditEntry(
      'Payment method removed',
      'payment_method_remove',
      userId,
      {
        before: originalState,
        after: billingProfile.toObject(),
        operationData: { correlationId, methodId }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Payment method removed successfully', {
      meta: {
        correlationId,
        customerId,
        methodId
      }
    });

    return billingProfile;
  }
);

export const setDefaultPaymentMethod = asyncHandler(
  async (customerId, methodId, correlationId, userId, requestContext = {}, next, req) => {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      return httpError(next, new Error('Billing profile not found'), req, 404);
    }

    const originalState = billingProfile.toObject();

    await billingProfile.setDefaultPaymentMethod(methodId);

    await billingProfile.addAuditEntry(
      'Default payment method updated',
      'payment_method_update',
      userId,
      {
        before: originalState,
        after: billingProfile.toObject(),
        operationData: { correlationId, methodId }
      },
      requestContext.ipAddress,
      requestContext.userAgent,
      'success'
    );

    logger.info('Default payment method updated successfully', {
      meta: {
        correlationId,
        customerId,
        methodId
      }
    });

    return billingProfile;
  }
);

export const getBillingProfile = asyncHandler(async (customerId, next, req) => {
  const billingProfile = await BillingProfile.findByCustomer(customerId);
  if (!billingProfile) {
    return httpError(next, new Error('Billing profile not found'), req, 404);
  }

  logger.info('Billing profile retrieved successfully', {
    meta: {
      customerId,
      paymentMethodsCount: billingProfile.paymentMethods.length,
      creditBalance: billingProfile.creditBalance
    }
  });

  return billingProfile;
});

export const getCustomerInvoices = asyncHandler(
  async (customerId, filters = {}, pagination = {}) => {
    const query = {
      customerId,
      'metadata.invoiceData': { $exists: true }
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query.createdAt.$lte = new Date(filters.dateTo);
      }
    }

    const invoices = await paymentRepository.findPayments(query, pagination);
    const total = await paymentRepository.countPayments(query);

    logger.info('Customer invoices retrieved successfully', {
      meta: {
        customerId,
        count: invoices.length,
        total,
        filters
      }
    });

    return {
      invoices,
      pagination: {
        total,
        limit: pagination.limit || 10,
        hasMore: invoices.length === (pagination.limit || 10)
      }
    };
  }
);

export const handlePaymentFailure = asyncHandler(
  async (
    subscriptionId,
    paymentId,
    correlationId,
    userId,
    failureData = {},
    requestContext = {}
  ) => {
    const subscription = await subscriptionRepository.findSubscriptionById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const payment = await paymentRepository.findPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status
    await paymentRepository.updatePaymentById(paymentId, {
      status: 'failed',
      failureReason: failureData.reason || 'Payment processing failed',
      'metadata.failureDetails': {
        ...failureData,
        failedAt: new Date(),
        correlationId
      }
    });

    // Handle subscription based on failure type and retry count
    const retryCount = payment.retryCount || 0;
    const maxRetries = 3;

    if (retryCount < maxRetries) {
      // Schedule retry
      const nextRetryDate = new Date(Date.now() + Math.pow(2, retryCount) * 60 * 60 * 1000); // Exponential backoff

      await subscriptionRepository.updateSubscriptionById(subscriptionId, {
        'metadata.paymentFailure': {
          lastFailure: new Date(),
          retryCount: retryCount + 1,
          nextRetry: nextRetryDate,
          correlationId
        }
      });

      logger.info('Payment failure handled - retry scheduled', {
        meta: {
          correlationId,
          subscriptionId,
          paymentId,
          retryCount: retryCount + 1,
          nextRetryDate
        }
      });
    } else {
      // Max retries exceeded - suspend subscription
      await subscriptionRepository.updateSubscriptionById(subscriptionId, {
        status: 'suspended',
        'metadata.suspension': {
          reason: 'Payment failure - max retries exceeded',
          suspendedAt: new Date(),
          correlationId,
          failedPaymentId: paymentId
        }
      });

      logger.warn('Subscription suspended due to payment failures', {
        meta: {
          correlationId,
          subscriptionId,
          paymentId,
          retryCount,
          customerId: subscription.customerId
        }
      });
    }

    return {
      subscription,
      payment,
      action: retryCount < maxRetries ? 'retry_scheduled' : 'subscription_suspended',
      retryCount: retryCount + 1
    };
  }
);
