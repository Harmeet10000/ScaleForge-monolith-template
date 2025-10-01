import Joi from 'joi';

const entityTypes = [
  'payment',
  'subscription',
  'user',
  'plan',
  'invoice',
  'refund',
  'webhook',
  'api_key',
  'organization',
  'billing_address'
];

const operationTypes = [
  // Payment operations
  'payment_create',
  'payment_update',
  'payment_verify',
  'payment_refund',
  'payment_cancel',
  'payment_retry',

  // Subscription operations
  'subscription_create',
  'subscription_update',
  'subscription_cancel',
  'subscription_renew',
  'subscription_suspend',
  'subscription_reactivate',
  'subscription_upgrade',
  'subscription_downgrade',

  // User operations
  'user_create',
  'user_update',
  'user_delete',
  'user_login',
  'user_logout',
  'user_password_change',

  // Plan operations
  'plan_create',
  'plan_update',
  'plan_delete',
  'plan_activate',
  'plan_deactivate',

  // Organization operations
  'org_create',
  'org_update',
  'org_delete',
  'org_member_add',
  'org_member_remove',
  'org_role_change',

  // API operations
  'api_key_create',
  'api_key_revoke',
  'api_key_rotate',

  // Webhook operations
  'webhook_create',
  'webhook_update',
  'webhook_delete',
  'webhook_trigger',

  // Generic operations
  'create',
  'update',
  'delete',
  'read',
  'export',
  'import'
];

const statusTypes = ['success', 'failure', 'error', 'pending'];
const retentionPolicies = ['standard', 'extended', 'permanent'];

export const validateGetEntityAuditTrail = Joi.object({
  entityType: Joi.string()
    .valid(...entityTypes)
    .required(),
  entityId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  operationType: Joi.string()
    .valid(...operationTypes)
    .optional(),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  status: Joi.string()
    .valid(...statusTypes)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  populate: Joi.boolean().default(false)
});

export const validateGetUserAuditTrail = Joi.object({
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  entityType: Joi.string()
    .valid(...entityTypes)
    .optional(),
  operationType: Joi.string()
    .valid(...operationTypes)
    .optional(),
  limit: Joi.number().integer().min(1).max(1000).default(50)
});

export const validateGetOrganizationAuditTrail = Joi.object({
  organizationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  entityType: Joi.string()
    .valid(...entityTypes)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100)
});

export const validateGetAuditByCorrelationId = Joi.object({
  correlationId: Joi.string().uuid().required()
});

export const validateSearchAuditEntries = Joi.object({
  entityType: Joi.string()
    .valid(...entityTypes)
    .optional(),
  entityId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  userId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  organizationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .optional(),
  operationType: Joi.string()
    .valid(...operationTypes)
    .optional(),
  status: Joi.string()
    .valid(...statusTypes)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  searchText: Joi.string().min(3).max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string()
    .valid('timestamp', 'entityType', 'operationType', 'status')
    .default('timestamp'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

export const validateGetOperationStats = Joi.object({
  entityType: Joi.string()
    .valid(...entityTypes)
    .required(),
  dateFrom: Joi.date().iso().required(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).required()
});

export const validateGetAuditDashboard = Joi.object({
  organizationId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
});

export const validateCreateAuditEntry = Joi.object({
  entityType: Joi.string()
    .valid(...entityTypes)
    .required(),
  entityId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required(),
  operation: Joi.string().min(1).max(100).required(),
  operationType: Joi.string()
    .valid(...operationTypes)
    .required(),
  correlationId: Joi.string().uuid().optional(),
  changes: Joi.object({
    before: Joi.any().optional(),
    after: Joi.any().optional(),
    operationData: Joi.any().optional()
  }).optional(),
  status: Joi.string()
    .valid(...statusTypes)
    .required(),
  errorMessage: Joi.string().max(500).optional(),
  errorCode: Joi.string().max(50).optional(),
  metadata: Joi.object().optional(),
  retentionPolicy: Joi.string()
    .valid(...retentionPolicies)
    .default('standard'),
  duration: Joi.number().integer().min(0).optional()
});
