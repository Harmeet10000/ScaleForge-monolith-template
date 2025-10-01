import mongoose, { Schema } from 'mongoose';
import { auditPlugin } from '../audit/auditUtils.js';

const paymentSchema = new Schema(
  {
    correlationId: {
      type: String,
      required: true,
      index: true
    },
    idempotencyKey: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    requestHash: {
      type: String,
      index: true
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      sparse: true,
      index: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      sparse: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP']
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      required: true,
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'netbanking', 'wallet', 'upi', 'bank_transfer']
    },
    failureReason: {
      type: String
    },
    retryCount: {
      type: Number,
      default: 0,
      min: 0
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    completedAt: {
      type: Date
    },
    expiresAt: {
      type: Date,
      index: { expireAfterSeconds: 0 }
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
paymentSchema.index({ customerId: 1, status: 1 });
paymentSchema.index({ correlationId: 1, status: 1 });
paymentSchema.index({ subscriptionId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

// Instance methods
paymentSchema.methods.markAsCompleted = function () {
  this.status = 'completed';
  this.completedAt = new Date();
  return this.save();
};

paymentSchema.methods.markAsFailed = function (reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

paymentSchema.methods.incrementRetry = function () {
  this.retryCount += 1;
  return this.save();
};

paymentSchema.methods.canRetry = function (maxRetries = 3) {
  return this.retryCount < maxRetries && this.status === 'failed';
};

paymentSchema.methods.setIdempotencyKey = function (key, requestHash) {
  this.idempotencyKey = key;
  this.requestHash = requestHash;
  return this.save();
};

// Static methods
paymentSchema.statics.findByCorrelationId = function (correlationId) {
  return this.findOne({ correlationId });
};

paymentSchema.statics.findByIdempotencyKey = function (idempotencyKey) {
  return this.findOne({ idempotencyKey });
};

paymentSchema.statics.createWithIdempotency = function (paymentData, idempotencyKey, requestHash) {
  return this.create({
    ...paymentData,
    idempotencyKey,
    requestHash
  });
};

paymentSchema.statics.findByCustomer = function (customerId, options = {}) {
  const query = this.find({ customerId });

  if (options.status) {
    query.where('status', options.status);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  if (options.sort) {
    query.sort(options.sort);
  } else {
    query.sort({ createdAt: -1 });
  }

  return query;
};

paymentSchema.statics.findPendingPayments = function () {
  return this.find({
    status: { $in: ['pending', 'processing'] },
    expiresAt: { $gt: new Date() }
  });
};

// Virtual for paymentId (returns _id as string)
paymentSchema.virtual('paymentId').get(function () {
  return this._id.toString();
});

// Ensure virtual fields are serialized
paymentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.paymentId = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

paymentSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.paymentId = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Pre-save middleware
paymentSchema.pre('save', function (next) {
  // Set expiration time for pending payments (24 hours)
  if (this.isNew && this.status === 'pending' && !this.expiresAt) {
    this.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  next();
});

// Apply audit plugin
paymentSchema.plugin(auditPlugin, {
  entityType: 'payment',
  excludeFields: ['updatedAt', '__v']
});

export const Payment = mongoose.model('Payment', paymentSchema);
