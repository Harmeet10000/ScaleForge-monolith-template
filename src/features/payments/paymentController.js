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
import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';

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
