import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: function () {
        return !this.isBroadcast;
      },
      index: true
    },
    isBroadcast: {
      type: Boolean,
      default: false,
      index: true
    },
    tenant: {
      type: String,
      index: true
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    workflowId: {
      type: String,
      required: true
    },
    channels: [
      {
        type: {
          type: String,
          enum: ['sms', 'email', 'web_push', 'mobile_push', 'in_app'],
          required: true
        },
        status: {
          type: String,
          enum: ['pending', 'sent', 'delivered', 'failed', 'read'],
          default: 'pending'
        },
        sentAt: Date,
        deliveredAt: Date,
        readAt: Date,
        errorMessage: String,
        errorCode: String,
        retryCount: { type: Number, default: 0 }
      }
    ],
    payload: mongoose.Schema.Types.Mixed,
    metadata: {
      source: String,
      priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
      },
      tags: [String],
      correlationId: String
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient querying
notificationLogSchema.index({ userId: 1, createdAt: -1 });
notificationLogSchema.index({ transactionId: 1, userId: 1 });
notificationLogSchema.index({ 'channels.status': 1, createdAt: -1 });
notificationLogSchema.index({ workflowId: 1, createdAt: -1 });

// Update the updatedAt field on save
notificationLogSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
