import mongoose, { Schema } from 'mongoose';

const auditSchema = new Schema(
  {
    // Core audit fields
    entityType: {
      type: String,
      required: true,
      index: true,
      enum: [
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
      ]
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },
    correlationId: {
      type: String,
      index: true
    },

    // Operation details
    operation: {
      type: String,
      required: true,
      index: true
    },
    operationType: {
      type: String,
      required: true,
      index: true,
      enum: [
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
      ]
    },

    // Actor information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey',
      sparse: true,
      index: true
    },

    // Request context
    ipAddress: {
      type: String,
      index: true
    },
    userAgent: String,
    requestId: {
      type: String
    },
    sessionId: {
      type: String,
      index: true
    },

    // Change details
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      operationData: mongoose.Schema.Types.Mixed
    },

    // Result information
    status: {
      type: String,
      enum: ['success', 'failure', 'error', 'pending'],
      required: true,
      index: true
    },
    errorMessage: String,
    errorCode: String,

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // Compliance and retention
    retentionPolicy: {
      type: String,
      enum: ['standard', 'extended', 'permanent'],
      default: 'standard',
      index: true
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }
    },

    // Performance tracking
    duration: {
      type: Number, // milliseconds
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
auditSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditSchema.index({ userId: 1, timestamp: -1 });
auditSchema.index({ organizationId: 1, timestamp: -1 });
auditSchema.index({ operationType: 1, timestamp: -1 });
auditSchema.index({ status: 1, timestamp: -1 });
auditSchema.index({ correlationId: 1, timestamp: -1 });
auditSchema.index({ requestId: 1 });

// Text index for searching operations and error messages
auditSchema.index({
  operation: 'text',
  errorMessage: 'text',
  'metadata.description': 'text'
});

// Static methods for querying
auditSchema.statics.findByEntity = function (entityType, entityId, options = {}) {
  const query = this.find({ entityType, entityId });

  if (options.operationType) {
    query.where('operationType', options.operationType);
  }

  if (options.userId) {
    query.where('userId', options.userId);
  }

  if (options.status) {
    query.where('status', options.status);
  }

  if (options.dateFrom) {
    query.where('timestamp').gte(options.dateFrom);
  }

  if (options.dateTo) {
    query.where('timestamp').lte(options.dateTo);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  query.sort({ timestamp: -1 });

  if (options.populate) {
    query.populate('userId', 'email name');
  }

  return query;
};

auditSchema.statics.findByUser = function (userId, options = {}) {
  const query = this.find({ userId });

  if (options.entityType) {
    query.where('entityType', options.entityType);
  }

  if (options.operationType) {
    query.where('operationType', options.operationType);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  query.sort({ timestamp: -1 });
  return query;
};

auditSchema.statics.findByOrganization = function (organizationId, options = {}) {
  const query = this.find({ organizationId });

  if (options.entityType) {
    query.where('entityType', options.entityType);
  }

  if (options.dateFrom) {
    query.where('timestamp').gte(options.dateFrom);
  }

  if (options.dateTo) {
    query.where('timestamp').lte(options.dateTo);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  query.sort({ timestamp: -1 });
  return query;
};

auditSchema.statics.findByCorrelationId = function (correlationId) {
  return this.find({ correlationId }).sort({ timestamp: 1 });
};

auditSchema.statics.getOperationStats = function (entityType, dateFrom, dateTo) {
  return this.aggregate([
    {
      $match: {
        entityType,
        timestamp: { $gte: dateFrom, $lte: dateTo }
      }
    },
    {
      $group: {
        _id: {
          operationType: '$operationType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Pre-save middleware to set expiration based on retention policy
auditSchema.pre('save', function (next) {
  if (this.isNew && !this.expiresAt) {
    const now = new Date();

    switch (this.retentionPolicy) {
      case 'standard':
        // 2 years retention
        this.expiresAt = new Date(now.getTime() + 2 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'extended':
        // 7 years retention (compliance requirements)
        this.expiresAt = new Date(now.getTime() + 7 * 365 * 24 * 60 * 60 * 1000);
        break;
      case 'permanent':
        // No expiration
        this.expiresAt = undefined;
        break;
    }
  }

  next();
});

export const Audit = mongoose.model('Audit', auditSchema);
