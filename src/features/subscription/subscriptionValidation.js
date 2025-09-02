import Joi from 'joi';

// Common validation schemas
const subscriptionIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid subscription ID format (must be valid ObjectId)'
  });

const customerIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .messages({
    'string.pattern.base': 'Invalid customer ID format (must be valid ObjectId)'
  });

const billingCycleSchema = Joi.string().valid('monthly', 'quarterly', 'annual');

const currencySchema = Joi.string().valid('INR', 'USD', 'EUR', 'GBP').default('INR');

const statusSchema = Joi.string().valid('active', 'cancelled', 'expired', 'suspended', 'pending');

const amountSchema = Joi.number().positive().precision(2);

const metadataSchema = Joi.object().pattern(Joi.string(), Joi.any()).optional();

const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0)
});

// Create subscription validation
export const validateCreateSubscriptionRequest = Joi.object({
  customerId: customerIdSchema.required(),
  planId: Joi.string().required(),
  planName: Joi.string().required(),
  billingCycle: billingCycleSchema.required(),
  amount: amountSchema.required(),
  currency: currencySchema,
  startDate: Joi.date().iso().optional(),
  trialDays: Joi.number().integer().min(0).max(365).optional(),
  metadata: metadataSchema
});

// Get subscription validation
export const validateGetSubscriptionRequest = Joi.object({
  subscriptionId: subscriptionIdSchema.required()
});

// Update subscription validation
export const validateUpdateSubscriptionRequest = Joi.object({
  subscriptionId: subscriptionIdSchema.required(),
  planId: Joi.string().optional(),
  planName: Joi.string().optional(),
  billingCycle: billingCycleSchema.optional(),
  amount: amountSchema.optional(),
  status: Joi.string().valid('active', 'cancelled', 'suspended').optional(),
  metadata: metadataSchema
})
  .custom((value, helpers) => {
    const { ...updates } = value;
    if (Object.keys(updates).length === 0) {
      return helpers.error('custom.noUpdates');
    }
    return value;
  })
  .messages({
    'custom.noUpdates': 'At least one field must be provided for update'
  });

// Cancel subscription validation
export const validateCancelSubscriptionRequest = Joi.object({
  subscriptionId: subscriptionIdSchema.required(),
  reason: Joi.string().max(500).optional(),
  immediate: Joi.boolean().default(false),
  refundProrated: Joi.boolean().default(false)
});

// Renew subscription validation
export const validateRenewSubscriptionRequest = Joi.object({
  subscriptionId: subscriptionIdSchema.required(),
  type: Joi.string().valid('manual', 'automatic').default('manual'),
  startDate: Joi.date().iso().optional()
});

// Get customer subscriptions validation
export const validateGetCustomerSubscriptionsRequest = Joi.object({
  customerId: customerIdSchema.required(),
  status: statusSchema.optional(),
  planId: Joi.string().optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().optional()
});

// Get subscriptions due for renewal validation
export const validateGetDueForRenewalRequest = Joi.object({
  bufferHours: Joi.number().integer().min(1).max(168).default(24) // Max 1 week
});

// Get subscription statistics validation
export const validateGetStatisticsRequest = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  planId: Joi.string().optional()
})
  .custom((value, helpers) => {
    // Validate date range
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) >= new Date(value.endDate)) {
        return helpers.error('custom.dateRange');
      }
    }
    return value;
  })
  .messages({
    'custom.dateRange': 'Start date must be before end date'
  });

// Process renewals validation
export const validateProcessRenewalsRequest = Joi.object({
  bufferHours: Joi.number().integer().min(1).max(168).default(24),
  dryRun: Joi.boolean().default(false)
});

// Subscription search validation
export const validateSearchSubscriptionsRequest = Joi.object({
  q: Joi.string().min(1).max(100).optional(),
  status: statusSchema.optional(),
  billingCycle: billingCycleSchema.optional(),
  planId: Joi.string().optional(),
  customerId: customerIdSchema.optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  minAmount: Joi.number().positive().optional(),
  maxAmount: Joi.number().positive().optional(),
  pagination: paginationSchema.optional(),
  sort: Joi.string()
    .valid(
      'createdAt',
      '-createdAt',
      'amount',
      '-amount',
      'nextBillingDate',
      '-nextBillingDate',
      'status',
      '-status'
    )
    .default('-createdAt')
})
  .custom((value, helpers) => {
    // Validate amount range
    if (value.minAmount && value.maxAmount) {
      if (value.minAmount >= value.maxAmount) {
        return helpers.error('custom.amountRange');
      }
    }

    // Validate date range
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) >= new Date(value.endDate)) {
        return helpers.error('custom.dateRange');
      }
    }

    return value;
  })
  .messages({
    'custom.amountRange': 'Minimum amount must be less than maximum amount',
    'custom.dateRange': 'Start date must be before end date'
  });

// Bulk operations validation
export const validateBulkUpdateSubscriptionsRequest = Joi.object({
  subscriptionIds: Joi.array().items(subscriptionIdSchema).min(1).max(100).required(),
  updates: Joi.object({
    status: statusSchema.optional(),
    metadata: metadataSchema
  })
    .min(1)
    .required(),
  reason: Joi.string().max(500).optional()
});

// Subscription audit trail validation
export const validateGetAuditTrailRequest = Joi.object({
  subscriptionId: subscriptionIdSchema.required(),
  operationType: Joi.string()
    .valid(
      'subscription_create',
      'subscription_update',
      'subscription_cancel',
      'subscription_renew',
      'subscription_suspend'
    )
    .optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  pagination: paginationSchema.optional()
});

// Subscription metrics validation
export const validateGetMetricsRequest = Joi.object({
  period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('month'),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  groupBy: Joi.array()
    .items(Joi.string().valid('status', 'billingCycle', 'planId', 'currency'))
    .optional(),
  includeRevenue: Joi.boolean().default(true),
  includeChurn: Joi.boolean().default(true)
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
