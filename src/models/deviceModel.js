import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    deviceId: {
      type: String,
      required: true,
      index: true
    },
    deviceType: {
      type: String,
      enum: ['web', 'ios', 'android'],
      required: true
    },
    token: {
      type: String,
      required: true
    },
    endpoint: {
      type: String,
      validate: {
        validator: function (v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Endpoint must be a valid URL'
      }
    },
    keys: {
      p256dh: String,
      auth: String
    },
    userAgent: String,
    isActive: {
      type: Boolean,
      default: true
    },
    lastUsed: {
      type: Date,
      default: Date.now
    },
    metadata: {
      appVersion: String,
      osVersion: String,
      deviceModel: String,
      language: String
    },
    createdAt: {
      type: Date,
      default: Date.now
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
deviceSchema.index({ userId: 1, deviceType: 1 });
deviceSchema.index({ userId: 1, isActive: 1 });
deviceSchema.index({ deviceId: 1, userId: 1 }, { unique: true });
deviceSchema.index({ token: 1 });

// Update the updatedAt and lastUsed fields on save
deviceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('token') || this.isModified('isActive')) {
    this.lastUsed = new Date();
  }
  next();
});

// Instance method to update last used timestamp
deviceSchema.methods.updateLastUsed = function () {
  this.lastUsed = new Date();
  this.updatedAt = new Date();
  return this.save();
};

// Instance method to deactivate device
deviceSchema.methods.deactivate = function () {
  this.isActive = false;
  this.updatedAt = new Date();
  return this.save();
};

// Static method to find active devices for user
deviceSchema.statics.findActiveDevicesForUser = function (userId, deviceType = null) {
  const query = { userId, isActive: true };
  if (deviceType) {
    query.deviceType = deviceType;
  }
  return this.find(query).sort({ lastUsed: -1 });
};

// Static method to cleanup inactive devices
deviceSchema.statics.cleanupInactiveDevices = function (daysInactive = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  return this.deleteMany({
    $or: [{ isActive: false, updatedAt: { $lt: cutoffDate } }, { lastUsed: { $lt: cutoffDate } }]
  });
};

export const Device = mongoose.model('Device', deviceSchema);
