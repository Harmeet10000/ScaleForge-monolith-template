import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: [
        'payment.authorized',
        'payment.captured',
        'payment.failed',
        'payment.refunded',
        'subscription.completed',
        'subscription.halted'
      ],
      index: true
    },

    correlationId: {
      type: String,
      required: true,
      index: true,
      description: 'Correlation ID from webhook processing'
    },

    signature: {
      type: String,
      required: true,
      description: 'x-razorpay-signature header value'
    },

    signatureValid: {
      type: Boolean,
      required: true,
      index: true,
      description: 'Whether signature verification passed'
    },

    payload: {
      type: mongoose.Schema.Types.Mixed,
      description: 'Raw webhook payload'
    },

    processingStatus: {
      type: String,
      enum: ['success', 'failed', 'pending', 'rejected'],
      default: 'pending',
      index: true,
      description: 'Outcome of webhook processing'
    },

    errorMessage: {
      type: String,
      description: 'Error message if processing failed'
    },

    errorStack: {
      type: String,
      description: 'Error stack trace for debugging'
    },

    processingTimeMs: {
      type: Number,
      description: 'Time taken to process webhook in milliseconds'
    },

    relatedPaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      sparse: true,
      index: true,
      description: 'Associated Payment document if found'
    },

    relatedSubscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      sparse: true,
      index: true,
      description: 'Associated Subscription document if found'
    },

    retryCount: {
      type: Number,
      default: 0,
      description: 'Number of retry attempts for failed webhooks'
    },

    nextRetryAt: {
      type: Date,
      sparse: true,
      description: 'When to retry failed webhook processing'
    },

    webhookId: {
      type: String,
      sparse: true,
      index: true,
      description: 'Razorpay webhook ID for idempotency'
    },

    ipAddress: {
      type: String,
      description: 'IP address of webhook sender'
    },

    userAgent: {
      type: String,
      description: 'User agent header from webhook request'
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
      expires: 7776000 // Auto-delete after 90 days
    },

    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'webhook_logs'
  }
);

// Compound indexes for efficient querying
webhookLogSchema.index({ eventType: 1, createdAt: -1 });
webhookLogSchema.index({ processingStatus: 1, createdAt: -1 });
webhookLogSchema.index({ correlationId: 1, processingStatus: 1 });
webhookLogSchema.index({ relatedPaymentId: 1, createdAt: -1 });
webhookLogSchema.index({ relatedSubscriptionId: 1, createdAt: -1 });

export const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);
