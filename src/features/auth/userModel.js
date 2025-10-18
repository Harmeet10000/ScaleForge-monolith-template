import mongoose, { Schema } from 'mongoose';
import { EUserRole } from '../../helpers/application.js';

const userSchema = new Schema(
  {
    name: {
      type: String,
      minlength: 2,
      maxlength: 72,
      required: true
    },
    emailAddress: {
      type: String,
      unique: true,
      required: true
    },
    phoneNumber: {
      _id: false,
      isoCode: {
        type: String
        // required: true
      },
      countryCode: {
        type: String
        // required: true
      },
      internationalNumber: {
        type: String
        // required: true
      }
    },
    timezone: {
      type: String,
      trim: true,
      required: true
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    oauth_id: {
      type: String,
      sparse: true,
      unique: true
    },
    image: {
      type: String,
      default: null
    },
    password: {
      type: String,
      required: function () {
        return this.provider === 'local';
      },
      select: false
    },
    role: {
      type: String,
      default: EUserRole.USER,
      enum: EUserRole,
      required: true
    },
    accountConfirmation: {
      _id: false,
      status: {
        type: Boolean,
        default: false,
        required: true
      },
      token: {
        type: String
        // required: true
      },
      code: {
        type: String
        // required: true
      },
      timestamp: {
        type: Date,
        default: null
      }
    },
    passwordReset: {
      _id: false,
      token: {
        type: String,
        default: null
      },
      expiry: {
        type: Number,
        default: null
      },
      lastResetAt: {
        type: Date,
        default: null
      }
    },
    lastLoginAt: {
      type: Date,
      default: null
    },
    consent: {
      type: Boolean,
      required: true
    },
    active: {
      type: Boolean,
      default: true,
      select: false
    },
    // Notification-related fields
    novuSubscriberId: {
      type: String,
      unique: true,
      sparse: true,
      index: true
    },
    notificationPreferences: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationPreferences'
    },
    devices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
      }
    ]
  },
  { timestamps: true }
);

// Instance methods for notification management
userSchema.methods.generateNovuSubscriberId = function () {
  if (!this.novuSubscriberId) {
    this.novuSubscriberId = `user_${this._id}`;
  }
  return this.novuSubscriberId;
};

userSchema.methods.addDevice = function (deviceId) {
  if (!this.devices.includes(deviceId)) {
    this.devices.push(deviceId);
  }
  return this.save();
};

userSchema.methods.removeDevice = function (deviceId) {
  this.devices = this.devices.filter((id) => !id.equals(deviceId));
  return this.save();
};

// Pre-save middleware to generate Novu subscriber ID if not present
userSchema.pre('save', function (next) {
  if (this.isNew && !this.novuSubscriberId) {
    this.generateNovuSubscriberId();
  }
  next();
});

export const User = mongoose.model('User', userSchema);
