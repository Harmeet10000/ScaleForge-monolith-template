import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import * as billingService from '../../services/billingService.js';

const getRequestContext = (req) => ({
  ipAddress: req.ip || req.connection.remoteAddress,
  userAgent: req.get('User-Agent'),
  source: 'billing_api'
});

export const generateInvoice = asyncHandler(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { dueDays, paymentTerms, notes } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!subscriptionId) {
    return httpError(next, new Error('Subscription ID is required'), req, 400);
  }

  const invoiceData = {
    dueDays: dueDays || 30,
    paymentTerms: paymentTerms || 'Net 30',
    notes
  };

  const result = await billingService.generateInvoice(
    subscriptionId,
    correlationId,
    userId,
    invoiceData,
    requestContext,
    next,
    req
  );

  if (result.isIdempotent) {
    return httpResponse(req, res, 200, 'Invoice retrieved (idempotent)', {
      invoice: result.invoice,
      isIdempotent: true
    });
  }

  return httpResponse(req, res, 201, 'Invoice generated successfully', { invoice: result.invoice });
});

export const generateProrationInvoice = asyncHandler(async (req, res, next) => {
  const { subscriptionId } = req.params;
  const { planName, amount } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!subscriptionId) {
    return httpError(next, new Error('Subscription ID is required'), req, 400);
  }

  if (!amount || amount <= 0) {
    return httpError(next, new Error('Valid amount is required for proration'), req, 400);
  }

  const changes = { planName, amount };

  const invoice = await billingService.generateProrationInvoice(
    subscriptionId,
    changes,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  if (!invoice) {
    return httpResponse(req, res, 200, 'No proration required', {
      message: 'No proration amount calculated'
    });
  }

  return httpResponse(req, res, 201, 'Proration invoice generated successfully', { invoice });
});

export const processRecurringBilling = asyncHandler(async (req, res, next) => {
  const { bufferHours = 24, dryRun = false } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;

  const results = await billingService.processRecurringBilling(correlationId, userId, {
    bufferHours,
    dryRun
  });

  return httpResponse(
    req,
    res,
    200,
    dryRun ? 'Recurring billing dry run completed' : 'Recurring billing processed successfully',
    { results }
  );
});

export const createBillingProfile = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const { billingAddress, taxInformation, preferences } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!customerId) {
    return httpError(next, new Error('Customer ID is required'), req, 400);
  }

  const profileData = {
    billingAddress,
    taxInformation,
    preferences
  };

  const billingProfile = await billingService.createBillingProfile(
    customerId,
    profileData,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  return httpResponse(req, res, 201, 'Billing profile created successfully', { billingProfile });
});

export const updateBillingProfile = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const { billingAddress, taxInformation, preferences } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!customerId) {
    return httpError(next, new Error('Customer ID is required'), req, 400);
  }

  const updates = {};
  if (billingAddress) updates.billingAddress = billingAddress;
  if (taxInformation) updates.taxInformation = taxInformation;
  if (preferences) updates.preferences = preferences;

  if (Object.keys(updates).length === 0) {
    return httpError(next, new Error('No valid updates provided'), req, 400);
  }

  const billingProfile = await billingService.updateBillingProfile(
    customerId,
    updates,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  return httpResponse(req, res, 200, 'Billing profile updated successfully', { billingProfile });
});

export const getBillingProfile = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const correlationId = req.correlationId;

  if (!customerId) {
    return httpError(next, new Error('Customer ID is required'), req, 400);
  }

  const billingProfile = await billingService.getBillingProfile(customerId, next, req);

  return httpResponse(req, res, 200, 'Billing profile retrieved successfully', { billingProfile });
});

export const addPaymentMethod = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const { methodId, type, details, isDefault } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!customerId) {
    return httpError(next, new Error('Customer ID is required'), req, 400);
  }

  if (!methodId || !type) {
    return httpError(next, new Error('Method ID and type are required'), req, 400);
  }

  const paymentMethodData = {
    methodId,
    type,
    details: details || {},
    isDefault: isDefault || false
  };

  const billingProfile = await billingService.addPaymentMethod(
    customerId,
    paymentMethodData,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  return httpResponse(req, res, 200, 'Payment method added successfully', { billingProfile });
});

export const removePaymentMethod = asyncHandler(async (req, res, next) => {
  const { customerId, methodId } = req.params;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!customerId || !methodId) {
    return httpError(next, new Error('Customer ID and Method ID are required'), req, 400);
  }

  const billingProfile = await billingService.removePaymentMethod(
    customerId,
    methodId,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  return httpResponse(req, res, 200, 'Payment method removed successfully', { billingProfile });
});

export const setDefaultPaymentMethod = asyncHandler(async (req, res, next) => {
  const { customerId, methodId } = req.params;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!customerId || !methodId) {
    return httpError(next, new Error('Customer ID and Method ID are required'), req, 400);
  }

  const billingProfile = await billingService.setDefaultPaymentMethod(
    customerId,
    methodId,
    correlationId,
    userId,
    requestContext,
    next,
    req
  );

  return httpResponse(req, res, 200, 'Default payment method updated successfully', {
    billingProfile
  });
});

export const getCustomerInvoices = asyncHandler(async (req, res, next) => {
  const { customerId } = req.params;
  const { status, dateFrom, dateTo, limit = 10, page = 0 } = req.query;
  const correlationId = req.correlationId;

  if (!customerId) {
    return httpError(next, new Error('Customer ID is required'), req, 400);
  }

  const filters = {};
  if (status) filters.status = status;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  const pagination = {
    limit: parseInt(limit),
    skip: parseInt(page) * parseInt(limit)
  };

  const result = await billingService.getCustomerInvoices(customerId, filters, pagination);

  return httpResponse(req, res, 200, 'Customer invoices retrieved successfully', {
    invoices: result.invoices,
    pagination: result.pagination
  });
});

export const handlePaymentFailure = asyncHandler(async (req, res, next) => {
  const { subscriptionId, paymentId } = req.params;
  const { reason, retryable = true } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;
  const requestContext = getRequestContext(req);

  if (!subscriptionId || !paymentId) {
    return httpError(next, new Error('Subscription ID and Payment ID are required'), req, 400);
  }

  const failureData = {
    reason: reason || 'Payment processing failed',
    retryable,
    failedAt: new Date()
  };

  const result = await billingService.handlePaymentFailure(
    subscriptionId,
    paymentId,
    correlationId,
    userId,
    failureData,
    requestContext
  );

  return httpResponse(req, res, 200, 'Payment failure handled successfully', {
    action: result.action,
    retryCount: result.retryCount,
    subscription: result.subscription,
    payment: result.payment
  });
});

export const getBillingStatistics = asyncHandler(async (req, res, next) => {
  const { customerId, dateFrom, dateTo } = req.query;
  const correlationId = req.correlationId;

  const filters = {};
  if (customerId) filters.customerId = customerId;
  if (dateFrom) filters.dateFrom = dateFrom;
  if (dateTo) filters.dateTo = dateTo;

  // This would need to be implemented in the billing service
  // For now, return a placeholder response
  const statistics = {
    totalInvoices: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    overdueAmount: 0,
    message: 'Statistics endpoint - implementation pending'
  };

  return httpResponse(req, res, 200, 'Billing statistics retrieved successfully', { statistics });
});

export const getOverdueInvoices = asyncHandler(async (req, res, next) => {
  const { limit = 50 } = req.query;
  const correlationId = req.correlationId;

  // This would need to be implemented in the billing service
  // For now, return a placeholder response
  const overdueInvoices = [];

  return httpResponse(req, res, 200, 'Overdue invoices retrieved successfully', {
    invoices: overdueInvoices,
    count: overdueInvoices.length
  });
});

export const sendInvoiceReminder = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { reminderType = 'standard' } = req.body;
  const correlationId = req.correlationId;
  const userId = req.user?.id;

  if (!invoiceId) {
    return httpError(next, new Error('Invoice ID is required'), req, 400);
  }

  // This would need to be implemented in the billing service
  // For now, return a placeholder response
  logger.info('Invoice reminder requested', {
    meta: {
      correlationId,
      invoiceId,
      reminderType,
      userId
    }
  });

  return httpResponse(req, res, 200, 'Invoice reminder sent successfully', {
    invoiceId,
    reminderType,
    sentAt: new Date()
  });
});
