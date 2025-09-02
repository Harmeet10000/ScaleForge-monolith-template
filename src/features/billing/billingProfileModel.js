import mongoose, { Schema } from 'mongoose';

const paymentMethodSchema = new Schema(
  {
    methodId: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['card', 'bank_account', 'wallet', 'upi'],
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    details: {
      // For cards
      last4: String,
      brand: String,
      expiryMonth: Number,
      expiryYear: Number,

      // For bank accounts
      accountNumber: String,
      ifscCode: String,
      bankName: String,

      // For wallets/UPI
      walletProvider: String,
      upiId: String,

      // Common fields
      holderName: String,
      nickname: String
    },
    expiresAt: {
      type: Date
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    _id: true
  }
);

const billingAddressSchema = new Schema(
  {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    postalCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true,
      default: 'IN'
    }
  },
  {
    _id: false
  }
);

const taxInformationSchema = new Schema(
  {
    taxId: {
      type: String
    },
    taxType: {
      type: String,
      enum: ['GST', 'PAN', 'VAT', 'SSN', 'EIN']
    },
    exemptionStatus: {
      type: Boolean,
      default: false
    },
    exemptionReason: {
      type: String
    }
  },
  {
    _id: false
  }
);

const preferencesSchema = new Schema(
  {
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'EUR', 'GBP']
    },
    invoiceDelivery: {
      type: String,
      enum: ['email', 'postal'],
      default: 'email'
    },
    autoRenewal: {
      type: Boolean,
      default: true
    },
    reminderDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'es', 'fr', 'de']
    }
  },
  {
    _id: false
  }
);

const billingProfileSchema = new Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true
    },
    paymentMethods: [paymentMethodSchema],
    billingAddress: billingAddressSchema,
    taxInformation: taxInformationSchema,
    preferences: {
      type: preferencesSchema,
      default: () => ({})
    },
    creditBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    totalSpent: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPaymentDate: {
      type: Date
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    auditTrail: [
      {
        _id: false,
        operation: {
          type: String,
          required: true
        },
        operationType: {
          type: String,
          enum: [
            'billing_profile_create',
            'billing_profile_update',
            'payment_method_add',
            'payment_method_remove',
            'payment_method_update'
          ],
          required: true
        },
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        details: {
          before: mongoose.Schema.Types.Mixed,
          after: mongoose.Schema.Types.Mixed,
          operationData: mongoose.Schema.Types.Mixed
        },
        ipAddress: String,
        userAgent: String,
        status: {
          type: String,
          enum: ['success', 'failure', 'error'],
          required: true
        },
        errorMessage: String,
        timestamp: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Indexes
billingProfileSchema.index({ 'paymentMethods.methodId': 1 });
billingProfileSchema.index({ 'paymentMethods.isDefault': 1 });

// Instance methods
billingProfileSchema.methods.addPaymentMethod = function (methodData) {
  // If this is the first payment method, make it default
  if (this.paymentMethods.length === 0) {
    methodData.isDefault = true;
  }

  // If setting as default, unset other defaults
  if (methodData.isDefault) {
    this.paymentMethods.forEach((method) => {
      method.isDefault = false;
    });
  }

  this.paymentMethods.push(methodData);
  return this.save();
};

billingProfileSchema.methods.removePaymentMethod = function (methodId) {
  const methodIndex = this.paymentMethods.findIndex((method) => method.methodId === methodId);

  if (methodIndex === -1) {
    throw new Error('Payment method not found');
  }

  const wasDefault = this.paymentMethods[methodIndex].isDefault;
  this.paymentMethods.splice(methodIndex, 1);

  // If removed method was default, set first remaining method as default
  if (wasDefault && this.paymentMethods.length > 0) {
    this.paymentMethods[0].isDefault = true;
  }

  return this.save();
};

billingProfileSchema.methods.setDefaultPaymentMethod = function (methodId) {
  let found = false;

  this.paymentMethods.forEach((method) => {
    if (method.methodId === methodId) {
      method.isDefault = true;
      found = true;
    } else {
      method.isDefault = false;
    }
  });

  if (!found) {
    throw new Error('Payment method not found');
  }

  return this.save();
};

billingProfileSchema.methods.getDefaultPaymentMethod = function () {
  return this.paymentMethods.find((method) => method.isDefault && method.isActive);
};

billingProfileSchema.methods.getActivePaymentMethods = function () {
  return this.paymentMethods.filter((method) => method.isActive);
};

billingProfileSchema.methods.updateBillingAddress = function (addressData) {
  this.billingAddress = { ...this.billingAddress.toObject(), ...addressData };
  return this.save();
};

billingProfileSchema.methods.updateTaxInformation = function (taxData) {
  this.taxInformation = { ...this.taxInformation.toObject(), ...taxData };
  return this.save();
};

billingProfileSchema.methods.updatePreferences = function (preferencesData) {
  this.preferences = { ...this.preferences.toObject(), ...preferencesData };
  return this.save();
};

billingProfileSchema.methods.addCredit = function (amount) {
  this.creditBalance += amount;
  return this.save();
};

billingProfileSchema.methods.deductCredit = function (amount) {
  if (this.creditBalance < amount) {
    throw new Error('Insufficient credit balance');
  }
  this.creditBalance -= amount;
  return this.save();
};

billingProfileSchema.methods.recordPayment = function (amount) {
  this.totalSpent += amount;
  this.lastPaymentDate = new Date();
  return this.save();
};

billingProfileSchema.methods.addAuditEntry = function (
  operation,
  operationType,
  userId,
  details,
  ipAddress,
  userAgent,
  status,
  errorMessage
) {
  this.auditTrail.push({
    operation,
    operationType,
    userId,
    details,
    ipAddress,
    userAgent,
    status,
    errorMessage,
    timestamp: new Date()
  });
  return this.save();
};

// Static methods
billingProfileSchema.statics.findByCustomer = function (customerId) {
  return this.findOne({ customerId }).populate('customerId', 'name emailAddress');
};

billingProfileSchema.statics.createProfile = function (customerId, initialData = {}) {
  return this.create({
    customerId,
    ...initialData
  });
};

billingProfileSchema.statics.findProfilesWithExpiredMethods = function () {
  const now = new Date();
  return this.find({
    'paymentMethods.expiresAt': { $lt: now },
    'paymentMethods.isActive': true
  });
};

// Pre-save middleware
billingProfileSchema.pre('save', function (next) {
  // Ensure only one default payment method
  const defaultMethods = this.paymentMethods.filter((method) => method.isDefault);
  if (defaultMethods.length > 1) {
    // Keep only the first default, unset others
    let firstDefaultFound = false;
    this.paymentMethods.forEach((method) => {
      if (method.isDefault) {
        if (firstDefaultFound) {
          method.isDefault = false;
        } else {
          firstDefaultFound = true;
        }
      }
    });
  }

  next();
});

export const BillingProfile = mongoose.model('BillingProfile', billingProfileSchema);
