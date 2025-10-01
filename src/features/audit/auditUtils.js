import * as auditService from './auditService.js';
import { logger } from '../../utils/logger.js';
import asyncHandler from 'express-async-handler';

/**
 * Create audit entry for payment operations
 */
export const auditPaymentOperation = asyncHandler(async (operation, payment, context = {}) => {
  const operationTypeMap = {
    create: 'payment_create',
    update: 'payment_update',
    verify: 'payment_verify',
    refund: 'payment_refund',
    cancel: 'payment_cancel',
    retry: 'payment_retry'
  };

  return await auditService.createAuditEntry({
    entityType: 'payment',
    entityId: payment._id || payment.id,
    operation: `Payment ${operation}`,
    operationType: operationTypeMap[operation] || operation,
    correlationId: payment.correlationId,
    status: 'success',
    metadata: {
      paymentAmount: payment.amount,
      paymentCurrency: payment.currency,
      paymentStatus: payment.status,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId
    },
    ...context
  });
});

/**
 * Create audit entry for subscription operations
 */
export const auditSubscriptionOperation = asyncHandler(
  async (operation, subscription, context = {}) => {
    const operationTypeMap = {
      create: 'subscription_create',
      update: 'subscription_update',
      cancel: 'subscription_cancel',
      renew: 'subscription_renew',
      suspend: 'subscription_suspend',
      reactivate: 'subscription_reactivate',
      upgrade: 'subscription_upgrade',
      downgrade: 'subscription_downgrade'
    };

    return await auditService.createAuditEntry({
      entityType: 'subscription',
      entityId: subscription._id || subscription.id,
      operation: `Subscription ${operation}`,
      operationType: operationTypeMap[operation] || operation,
      status: 'success',
      metadata: {
        planId: subscription.planId,
        planName: subscription.planName,
        billingCycle: subscription.billingCycle,
        amount: subscription.amount,
        currency: subscription.currency,
        subscriptionStatus: subscription.status
      },
      ...context
    });
  }
);

/**
 * Create audit entry for user operations
 */
export const auditUserOperation = asyncHandler(async (operation, user, context = {}) => {
  const operationTypeMap = {
    create: 'user_create',
    update: 'user_update',
    delete: 'user_delete',
    login: 'user_login',
    logout: 'user_logout',
    password_change: 'user_password_change'
  };

  return await auditService.createAuditEntry({
    entityType: 'user',
    entityId: user._id || user.id,
    operation: `User ${operation}`,
    operationType: operationTypeMap[operation] || operation,
    status: 'success',
    metadata: {
      userEmail: user.email,
      userName: user.name,
      userRole: user.role
    },
    ...context
  });
});

/**
 * Create audit entry with before/after comparison
 */
export const auditEntityChange = asyncHandler(
  async (entityType, entityId, operation, beforeData, afterData, context = {}) => {
    const changes = {
      before: beforeData,
      after: afterData,
      operationData: context.operationData
    };

    return await auditService.createAuditEntry({
      entityType,
      entityId,
      operation,
      operationType: context.operationType || `${entityType}_update`,
      changes,
      status: 'success',
      ...context
    });
  }
);

/**
 * Create audit entry for failed operations
 */
export const auditFailedOperation = asyncHandler(
  async (entityType, entityId, operation, error, context = {}) => {
    await auditService.createAuditEntry({
      entityType,
      entityId,
      operation,
      operationType: context.operationType || `${entityType}_${operation}`,
      status: 'failure',
      errorMessage: error.message,
      errorCode: error.code,
      ...context
    });
  }
);

/**
 * Audit API key operations
 */
export const auditApiKeyOperation = asyncHandler(async (operation, apiKey, context = {}) => {
  const operationTypeMap = {
    create: 'api_key_create',
    revoke: 'api_key_revoke',
    rotate: 'api_key_rotate'
  };

  return await auditService.createAuditEntry({
    entityType: 'api_key',
    entityId: apiKey._id || apiKey.id,
    operation: `API Key ${operation}`,
    operationType: operationTypeMap[operation] || operation,
    status: 'success',
    metadata: {
      keyName: apiKey.name,
      keyScope: apiKey.scope,
      keyStatus: apiKey.status
    },
    ...context
  });
});

/**
 * Audit webhook operations
 */
export const auditWebhookOperation = asyncHandler(async (operation, webhook, context = {}) => {
  const operationTypeMap = {
    create: 'webhook_create',
    update: 'webhook_update',
    delete: 'webhook_delete',
    trigger: 'webhook_trigger'
  };

  return await auditService.createAuditEntry({
    entityType: 'webhook',
    entityId: webhook._id || webhook.id,
    operation: `Webhook ${operation}`,
    operationType: operationTypeMap[operation] || operation,
    status: 'success',
    metadata: {
      webhookUrl: webhook.url,
      webhookEvents: webhook.events,
      webhookStatus: webhook.status
    },
    ...context
  });
});

/**
 * Extract request context for auditing
 */
export const extractRequestContext = (req) => ({
  userId: req.user?.id,
  organizationId: req.user?.organizationId,
  ipAddress: req.ip,
  userAgent: req.get('User-Agent'),
  requestId: req.id,
  sessionId: req.sessionID
});

/**
 * Create correlation ID for related operations
 */
export const createCorrelationId = () => {
  `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Batch audit multiple operations
 */
export const batchAudit = asyncHandler(
  async (auditEntries) => await auditService.bulkCreateAuditEntries(auditEntries)
);

/**
 * Mongoose plugin to automatically audit model changes
 */
export function auditPlugin(schema, options = {}) {
  const { entityType, excludeFields = [] } = options;

  // Pre-save middleware to capture before state
  schema.pre('save', function (next) {
    if (!this.isNew) {
      this._originalDoc = this.toObject();
    }
    next();
  });

  // Post-save middleware to create audit entry
  schema.post('save', async function (doc) {
    try {
      const context = this._auditContext || {};

      if (this.isNew) {
        // Document creation
        await auditEntityChange(entityType, doc._id, 'create', null, doc.toObject(), {
          operationType: `${entityType}_create`,
          ...context
        });
      } else if (this._originalDoc) {
        // Document update
        const beforeData = { ...this._originalDoc };
        const afterData = doc.toObject();

        // Remove excluded fields
        excludeFields.forEach((field) => {
          delete beforeData[field];
          delete afterData[field];
        });

        await auditEntityChange(entityType, doc._id, 'update', beforeData, afterData, {
          operationType: `${entityType}_update`,
          ...context
        });
      }
    } catch (error) {
      logger.error('Failed to audit document change', {
        error: error.message,
        entityType,
        documentId: doc._id
      });
    }
  });

  // Post-remove middleware
  schema.post('remove', async function (doc) {
    try {
      const context = this._auditContext || {};

      await auditEntityChange(entityType, doc._id, 'delete', doc.toObject(), null, {
        operationType: `${entityType}_delete`,
        ...context
      });
    } catch (error) {
      logger.error('Failed to audit document deletion', {
        error: error.message,
        entityType,
        documentId: doc._id
      });
    }
  });

  // Method to set audit context
  schema.methods.setAuditContext = function (context) {
    this._auditContext = context;
    return this;
  };
}
