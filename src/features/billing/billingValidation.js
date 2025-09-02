import Joi from 'joi';

// Billing Address Schema
const billingAddressSchema = Joi.object({
  street: Joi.string().min(5).max(200).required().messages({
    'string.empty': 'Street address is required',
    'string.min': 'Street address must be at least 5 characters long',
    'string.max': 'Street address cannot exceed 200 characters'
  }),
  city: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'City is required',
    'string.min': 'City must be at least 2 characters long',
    'string.max': 'City cannot exceed 100 characters'
  }),
  state: Joi.string().min(2).max(100).required().messages({
    'string.empty': 'State is required',
    'string.min': 'State must be at least 2 characters long',
    'string.max': 'State cannot exceed 100 characters'
  }),
  postalCode: Joi.string().min(3).max(20).required().messages({
    'string.empty': 'Postal code is required',
    'string.min': 'Postal code must be at least 3 characters long',
    'string.max': 'Postal code cannot exceed 20 characters'
  }),
  country: Joi.string().length(2).default('IN').messages({
    'string.length': 'Country must be a 2-character ISO code'
  })
});

// Tax Information Schema
const taxInformationSchema = Joi.object({
  taxId: Joi.string().min(5).max(50).messages({
    'string.min': 'Tax ID must be at least 5 characters long',
    'string.max': 'Tax ID cannot exceed 50 characters'
  }),
  taxType: Joi.string().valid('GST', 'PAN', 'VAT', 'SSN', 'EIN').messages({
    'any.only': 'Tax type must be one of: GST, PAN, VAT, SSN, EIN'
  }),
  exemptionStatus: Joi.boolean().default(false),
  exemptionReason: Joi.string()
    .max(500)
    .when('exemptionStatus', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'string.max': 'Exemption reason cannot exceed 500 characters',
      'any.required': 'Exemption reason is required when exemption status is true'
    })
});

// Preferences Schema
const preferencesSchema = Joi.object({
  currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').default('INR').messages({
    'any.only': 'Currency must be one of: INR, USD, EUR, GBP'
  }),
  invoiceDelivery: Joi.string().valid('email', 'postal').default('email').messages({
    'any.only': 'Invoice delivery must be either email or postal'
  }),
  autoRenewal: Joi.boolean().default(true),
  reminderDays: Joi.number().integer().min(1).max(30).default(7).messages({
    'number.base': 'Reminder days must be a number',
    'number.integer': 'Reminder days must be an integer',
    'number.min': 'Reminder days must be at least 1',
    'number.max': 'Reminder days cannot exceed 30'
  }),
  language: Joi.string().valid('en', 'hi', 'es', 'fr', 'de').default('en').messages({
    'any.only': 'Language must be one of: en, hi, es, fr, de'
  })
});

// Payment Method Details Schema
const paymentMethodDetailsSchema = Joi.object({
  // For cards
  last4: Joi.string()
    .length(4)
    .pattern(/^\d{4}$/)
    .messages({
      'string.length': 'Last 4 digits must be exactly 4 characters',
      'string.pattern.base': 'Last 4 digits must contain only numbers'
    }),
  brand: Joi.string().valid('visa', 'mastercard', 'amex', 'discover', 'rupay').messages({
    'any.only': 'Card brand must be one of: visa, mastercard, amex, discover, rupay'
  }),
  expiryMonth: Joi.number().integer().min(1).max(12).messages({
    'number.base': 'Expiry month must be a number',
    'number.integer': 'Expiry month must be an integer',
    'number.min': 'Expiry month must be between 1 and 12',
    'number.max': 'Expiry month must be between 1 and 12'
  }),
  expiryYear: Joi.number().integer().min(new Date().getFullYear()).messages({
    'number.base': 'Expiry year must be a number',
    'number.integer': 'Expiry year must be an integer',
    'number.min': 'Expiry year cannot be in the past'
  }),

  // For bank accounts
  accountNumber: Joi.string().min(8).max(20).pattern(/^\d+$/).messages({
    'string.min': 'Account number must be at least 8 digits',
    'string.max': 'Account number cannot exceed 20 digits',
    'string.pattern.base': 'Account number must contain only numbers'
  }),
  ifscCode: Joi.string()
    .length(11)
    .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .messages({
      'string.length': 'IFSC code must be exactly 11 characters',
      'string.pattern.base': 'Invalid IFSC code format'
    }),
  bankName: Joi.string().min(2).max(100).messages({
    'string.min': 'Bank name must be at least 2 characters',
    'string.max': 'Bank name cannot exceed 100 characters'
  }),

  // For wallets/UPI
  walletProvider: Joi.string().valid('paytm', 'phonepe', 'googlepay', 'amazonpay').messages({
    'any.only': 'Wallet provider must be one of: paytm, phonepe, googlepay, amazonpay'
  }),
  upiId: Joi.string()
    .pattern(/^[\w.-]+@[\w.-]+$/)
    .messages({
      'string.pattern.base': 'Invalid UPI ID format'
    }),

  // Common fields
  holderName: Joi.string().min(2).max(100).messages({
    'string.min': 'Holder name must be at least 2 characters',
    'string.max': 'Holder name cannot exceed 100 characters'
  }),
  nickname: Joi.string().max(50).messages({
    'string.max': 'Nickname cannot exceed 50 characters'
  })
});

// Billing Profile Schema
const billingProfileSchema = Joi.object({
  billingAddress: billingAddressSchema,
  taxInformation: taxInformationSchema,
  preferences: preferencesSchema
});

// Payment Method Schema
const paymentMethodSchema = Joi.object({
  methodId: Joi.string().required().messages({
    'string.empty': 'Method ID is required'
  }),
  type: Joi.string().valid('card', 'bank_account', 'wallet', 'upi').required().messages({
    'string.empty': 'Payment method type is required',
    'any.only': 'Payment method type must be one of: card, bank_account, wallet, upi'
  }),
  details: paymentMethodDetailsSchema.default({}),
  isDefault: Joi.boolean().default(false),
  expiresAt: Joi.date().greater('now').messages({
    'date.greater': 'Expiration date must be in the future'
  })
});

// Invoice Generation Schema
const invoiceGenerationSchema = Joi.object({
  dueDays: Joi.number().integer().min(1).max(365).default(30).messages({
    'number.base': 'Due days must be a number',
    'number.integer': 'Due days must be an integer',
    'number.min': 'Due days must be at least 1',
    'number.max': 'Due days cannot exceed 365'
  }),
  paymentTerms: Joi.string().max(100).default('Net 30').messages({
    'string.max': 'Payment terms cannot exceed 100 characters'
  }),
  notes: Joi.string().max(1000).messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  })
});

// Validation Middleware Functions
export const validateBillingProfile = (req, res, next) => {
  const { error } = billingProfileSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
  }

  next();
};

export const validatePaymentMethod = (req, res, next) => {
  const { error } = paymentMethodSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
  }

  // Additional validation based on payment method type
  const { type, details } = req.body;

  if (type === 'card') {
    if (!details.last4 || !details.brand || !details.expiryMonth || !details.expiryYear) {
      let x;
    }
  }

  if (type === 'bank_account') {
    if (!details.accountNumber || !details.ifscCode || !details.bankName) {
      let x;
    }
  }

  if (type === 'wallet' && !details.walletProvider) {
    let x;
  }

  if (type === 'upi' && !details.upiId) {
    let x;
  }

  next();
};

export const validateInvoiceGeneration = (req, res, next) => {
  const { error } = invoiceGenerationSchema.validate(req.body, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
  }

  next();
};

// Export schemas for use in other modules
export {
  billingProfileSchema,
  paymentMethodSchema,
  invoiceGenerationSchema,
  billingAddressSchema,
  taxInformationSchema,
  preferencesSchema,
  paymentMethodDetailsSchema
};
