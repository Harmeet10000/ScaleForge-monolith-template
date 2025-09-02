import Joi from 'joi';
import { EPaymentStatus, ECurrency } from './paymentConstants.js';

export const validateCheckout = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string()
    .valid(...Object.values(ECurrency))
    .optional()
    .default('INR'),
  subscriptionId: Joi.string().optional(),
  metadata: Joi.object().optional(),
  description: Joi.string().max(255).optional(),
  notes: Joi.object().optional()
});

export const validatePaymentVerification = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required()
});

export const validatePaymentHistory = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(10),
  status: Joi.string()
    .valid(...Object.values(EPaymentStatus))
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  subscriptionId: Joi.string().optional(),
  sortBy: Joi.string().valid('createdAt', 'amount', 'status').optional().default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
});

export const validatePaymentId = Joi.object({
  paymentId: Joi.string().required()
});

export const validateRefund = Joi.object({
  paymentId: Joi.string().required(),
  amount: Joi.number().positive().precision(2).optional(),
  reason: Joi.string().max(255).optional(),
  notes: Joi.object().optional()
});

// Reusable validation function (consistent with existing pattern)
export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  return {
    value: result.value,
    error: result.error
  };
};
