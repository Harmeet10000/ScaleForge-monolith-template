import mongoose, { Schema } from 'mongoose';
import { auditPlugin } from '../audit/auditUtils.js';

const subscriptionSchema = new Schema(
  {
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
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    planId: {
      type: String,
      required: true,
      index: true
    },
    planName: {
      type: String,
      required: true
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      required: true,
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
      enum: ['active', 'cancelled', 'expired', 'suspended', 'pending'],
      default: 'pending',
      required: true,
      index: true
    },
    currentPeriodStart: {
      type: Date,
      required: true,
      index: true
    },
    currentPeriodEnd: {
      type: Date,
      required: true
    },
    nextBillingDate: {
      type: Date,
      required: true,
      index: true
    },
    trialEnd: {
      type: Date,
      index: true
    },
    cancelledAt: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for efficient queries
subscriptionSchema.index({ customerId: 1, status: 1 });
subscriptionSchema.index({ status: 1, nextBillingDate: 1 });
subscriptionSchema.index({ planId: 1, status: 1 });
subscriptionSchema.index({ currentPeriodEnd: 1 });

// Instance methods
subscriptionSchema.methods.activate = function () {
  this.status = 'active';
  return this.save();
};

subscriptionSchema.methods.cancel = function (reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  if (reason) {
    this.metadata.cancellationReason = reason;
  }
  return this.save();
};

subscriptionSchema.methods.suspend = function (reason) {
  this.status = 'suspended';
  if (reason) {
    this.metadata.suspensionReason = reason;
  }
  return this.save();
};

subscriptionSchema.methods.expire = function () {
  this.status = 'expired';
  return this.save();
};

subscriptionSchema.methods.isActive = function () {
  return this.status === 'active' && new Date() < this.currentPeriodEnd;
};

subscriptionSchema.methods.isInTrial = function () {
  return this.trialEnd && new Date() < this.trialEnd;
};

subscriptionSchema.methods.getDaysUntilRenewal = function () {
  const now = new Date();
  const renewalDate = this.nextBillingDate;
  const diffTime = renewalDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

subscriptionSchema.methods.calculateNextBillingDate = function () {
  const currentEnd = this.currentPeriodEnd;
  let nextBilling;

  switch (this.billingCycle) {
    case 'monthly':
      nextBilling = new Date(currentEnd);
      nextBilling.setMonth(nextBilling.getMonth() + 1);
      break;
    case 'quarterly':
      nextBilling = new Date(currentEnd);
      nextBilling.setMonth(nextBilling.getMonth() + 3);
      break;
    case 'annual':
      nextBilling = new Date(currentEnd);
      nextBilling.setFullYear(nextBilling.getFullYear() + 1);
      break;
    default:
      throw new Error(`Invalid billing cycle: ${this.billingCycle}`);
  }

  return nextBilling;
};

subscriptionSchema.methods.renewPeriod = function () {
  const nextStart = this.currentPeriodEnd;
  const nextEnd = this.calculateNextBillingDate();

  this.currentPeriodStart = nextStart;
  this.currentPeriodEnd = nextEnd;
  this.nextBillingDate = nextEnd;

  return this.save();
};

subscriptionSchema.methods.setIdempotencyKey = function (key, requestHash) {
  this.idempotencyKey = key;
  this.requestHash = requestHash;
  return this.save();
};

// Static methods
subscriptionSchema.statics.findByIdempotencyKey = function (idempotencyKey) {
  return this.findOne({ idempotencyKey });
};

subscriptionSchema.statics.createWithIdempotency = function (
  subscriptionData,
  idempotencyKey,
  requestHash
) {
  return this.create({
    ...subscriptionData,
    idempotencyKey,
    requestHash
  });
};

subscriptionSchema.statics.findByCustomer = function (customerId, options = {}) {
  const query = this.find({ customerId });

  if (options.status) {
    query.where('status', options.status);
  }

  if (options.planId) {
    query.where('planId', options.planId);
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

subscriptionSchema.statics.findActiveSubscriptions = function () {
  return this.find({
    status: 'active',
    currentPeriodEnd: { $gt: new Date() }
  });
};

subscriptionSchema.statics.findDueForRenewal = function (bufferHours = 24) {
  const bufferTime = new Date(Date.now() + bufferHours * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    nextBillingDate: { $lte: bufferTime }
  });
};

subscriptionSchema.statics.findExpiredSubscriptions = function () {
  return this.find({
    status: 'active',
    currentPeriodEnd: { $lt: new Date() }
  });
};

// Virtual for paymentId (returns _id as string)
subscriptionSchema.virtual('subscriptionId').get(function () {
  return this._id.toString();
});

// Ensure virtual fields are serialized
subscriptionSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.subscriptionId = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

subscriptionSchema.set('toObject', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.subscriptionId = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Apply audit plugin
subscriptionSchema.plugin(auditPlugin, {
  entityType: 'subscription',
  excludeFields: ['updatedAt', '__v']
});

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
