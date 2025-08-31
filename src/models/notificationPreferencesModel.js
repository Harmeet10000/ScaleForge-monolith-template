import mongoose from 'mongoose';

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    channels: {
      sms: {
        enabled: { type: Boolean, default: true },
        workflows: [String]
      },
      email: {
        enabled: { type: Boolean, default: true },
        workflows: [String]
      },
      web_push: {
        enabled: { type: Boolean, default: true },
        workflows: [String]
      },
      mobile_push: {
        enabled: { type: Boolean, default: true },
        workflows: [String]
      },
      in_app: {
        enabled: { type: Boolean, default: true },
        workflows: [String]
      }
    },
    globalSettings: {
      doNotDisturb: {
        enabled: { type: Boolean, default: false },
        startTime: {
          type: String,
          validate: {
            validator: function (v) {
              return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'Start time must be in HH:MM format'
          }
        },
        endTime: {
          type: String,
          validate: {
            validator: function (v) {
              return !v || /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
            },
            message: 'End time must be in HH:MM format'
          }
        }
      },
      timezone: {
        type: String,
        default: 'UTC',
        validate: {
          validator: function (v) {
            try {
              Intl.DateTimeFormat(undefined, { timeZone: v });
              return true;
            } catch (e) {
              return false;
            }
          },
          message: 'Invalid timezone'
        }
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        startTime: String,
        endTime: String
      }
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

// Update the updatedAt field on save
notificationPreferencesSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get default preferences
notificationPreferencesSchema.statics.getDefaultPreferences = function () {
  return {
    channels: {
      sms: { enabled: true, workflows: [] },
      email: { enabled: true, workflows: [] },
      web_push: { enabled: true, workflows: [] },
      mobile_push: { enabled: true, workflows: [] },
      in_app: { enabled: true, workflows: [] }
    },
    globalSettings: {
      doNotDisturb: {
        enabled: false,
        startTime: null,
        endTime: null
      },
      timezone: 'UTC',
      quietHours: {
        enabled: false,
        startTime: null,
        endTime: null
      }
    }
  };
};

export const NotificationPreferences = mongoose.model(
  'NotificationPreferences',
  notificationPreferencesSchema
);
