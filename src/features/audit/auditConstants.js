/**
 * Audit system constants
 */

export const ENTITY_TYPES = {
  PAYMENT: 'payment',
  SUBSCRIPTION: 'subscription',
  USER: 'user',
  PLAN: 'plan',
  INVOICE: 'invoice',
  REFUND: 'refund',
  WEBHOOK: 'webhook',
  API_KEY: 'api_key',
  ORGANIZATION: 'organization',
  BILLING_ADDRESS: 'billing_address'
};

export const OPERATION_TYPES = {
  // Payment operations
  PAYMENT_CREATE: 'payment_create',
  PAYMENT_UPDATE: 'payment_update',
  PAYMENT_VERIFY: 'payment_verify',
  PAYMENT_REFUND: 'payment_refund',
  PAYMENT_CANCEL: 'payment_cancel',
  PAYMENT_RETRY: 'payment_retry',

  // Subscription operations
  SUBSCRIPTION_CREATE: 'subscription_create',
  SUBSCRIPTION_UPDATE: 'subscription_update',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_RENEW: 'subscription_renew',
  SUBSCRIPTION_SUSPEND: 'subscription_suspend',
  SUBSCRIPTION_REACTIVATE: 'subscription_reactivate',
  SUBSCRIPTION_UPGRADE: 'subscription_upgrade',
  SUBSCRIPTION_DOWNGRADE: 'subscription_downgrade',

  // User operations
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_PASSWORD_CHANGE: 'user_password_change',

  // Plan operations
  PLAN_CREATE: 'plan_create',
  PLAN_UPDATE: 'plan_update',
  PLAN_DELETE: 'plan_delete',
  PLAN_ACTIVATE: 'plan_activate',
  PLAN_DEACTIVATE: 'plan_deactivate',

  // Organization operations
  ORG_CREATE: 'org_create',
  ORG_UPDATE: 'org_update',
  ORG_DELETE: 'org_delete',
  ORG_MEMBER_ADD: 'org_member_add',
  ORG_MEMBER_REMOVE: 'org_member_remove',
  ORG_ROLE_CHANGE: 'org_role_change',

  // API operations
  API_KEY_CREATE: 'api_key_create',
  API_KEY_REVOKE: 'api_key_revoke',
  API_KEY_ROTATE: 'api_key_rotate',

  // Webhook operations
  WEBHOOK_CREATE: 'webhook_create',
  WEBHOOK_UPDATE: 'webhook_update',
  WEBHOOK_DELETE: 'webhook_delete',
  WEBHOOK_TRIGGER: 'webhook_trigger',

  // Generic operations
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  READ: 'read',
  EXPORT: 'export',
  IMPORT: 'import'
};

export const AUDIT_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error',
  PENDING: 'pending'
};

export const RETENTION_POLICIES = {
  STANDARD: 'standard', // 2 years
  EXTENDED: 'extended', // 7 years
  PERMANENT: 'permanent' // No expiration
};

export const AUDIT_CONFIG = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 1000,
  BATCH_SIZE: 100,
  CLEANUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours in milliseconds

  RETENTION_PERIODS: {
    [RETENTION_POLICIES.STANDARD]: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
    [RETENTION_POLICIES.EXTENDED]: 7 * 365 * 24 * 60 * 60 * 1000, // 7 years
    [RETENTION_POLICIES.PERMANENT]: null // No expiration
  }
};

export const SENSITIVE_FIELDS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'cookie',
  'session'
];

export const AUDIT_EVENTS = {
  ENTRY_CREATED: 'audit.entry.created',
  ENTRY_FAILED: 'audit.entry.failed',
  CLEANUP_COMPLETED: 'audit.cleanup.completed',
  RETENTION_EXPIRED: 'audit.retention.expired'
};
