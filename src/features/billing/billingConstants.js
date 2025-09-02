// Billing and Invoice Constants

export const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PAID: 'paid',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded'
};

export const INVOICE_TYPES = {
  INVOICE: 'invoice',
  CREDIT_NOTE: 'credit_note',
  PRORATION_INVOICE: 'proration_invoice',
  REFUND_INVOICE: 'refund_invoice'
};

export const PAYMENT_METHOD_TYPES = {
  CARD: 'card',
  BANK_ACCOUNT: 'bank_account',
  WALLET: 'wallet',
  UPI: 'upi'
};

export const CARD_BRANDS = {
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMEX: 'amex',
  DISCOVER: 'discover',
  RUPAY: 'rupay'
};

export const WALLET_PROVIDERS = {
  PAYTM: 'paytm',
  PHONEPE: 'phonepe',
  GOOGLEPAY: 'googlepay',
  AMAZONPAY: 'amazonpay'
};

export const TAX_TYPES = {
  GST: 'GST',
  PAN: 'PAN',
  VAT: 'VAT',
  SSN: 'SSN',
  EIN: 'EIN'
};

export const CURRENCIES = {
  INR: 'INR',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP'
};

export const INVOICE_DELIVERY_METHODS = {
  EMAIL: 'email',
  POSTAL: 'postal'
};

export const LANGUAGES = {
  ENGLISH: 'en',
  HINDI: 'hi',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de'
};

export const BILLING_OPERATION_TYPES = {
  BILLING_PROFILE_CREATE: 'billing_profile_create',
  BILLING_PROFILE_UPDATE: 'billing_profile_update',
  PAYMENT_METHOD_ADD: 'payment_method_add',
  PAYMENT_METHOD_REMOVE: 'payment_method_remove',
  PAYMENT_METHOD_UPDATE: 'payment_method_update',
  INVOICE_CREATE: 'invoice_create',
  INVOICE_UPDATE: 'invoice_update',
  INVOICE_SEND: 'invoice_send',
  INVOICE_PAY: 'invoice_pay',
  INVOICE_CANCEL: 'invoice_cancel',
  INVOICE_REFUND: 'invoice_refund'
};

export const AUDIT_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error'
};

export const DEFAULT_VALUES = {
  CURRENCY: CURRENCIES.INR,
  INVOICE_DELIVERY: INVOICE_DELIVERY_METHODS.EMAIL,
  LANGUAGE: LANGUAGES.ENGLISH,
  REMINDER_DAYS: 7,
  DUE_DAYS: 30,
  PAYMENT_TERMS: 'Net 30',
  TAX_RATE: 0.18, // 18% GST
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_BASE: 3600000, // 1 hour in milliseconds
  BUFFER_HOURS: 24,
  BATCH_SIZE: 50
};

export const VALIDATION_RULES = {
  INVOICE_NUMBER_LENGTH: 20,
  PAYMENT_TERMS_MAX_LENGTH: 100,
  NOTES_MAX_LENGTH: 1000,
  STREET_MIN_LENGTH: 5,
  STREET_MAX_LENGTH: 200,
  CITY_MIN_LENGTH: 2,
  CITY_MAX_LENGTH: 100,
  STATE_MIN_LENGTH: 2,
  STATE_MAX_LENGTH: 100,
  POSTAL_CODE_MIN_LENGTH: 3,
  POSTAL_CODE_MAX_LENGTH: 20,
  TAX_ID_MIN_LENGTH: 5,
  TAX_ID_MAX_LENGTH: 50,
  EXEMPTION_REASON_MAX_LENGTH: 500,
  HOLDER_NAME_MIN_LENGTH: 2,
  HOLDER_NAME_MAX_LENGTH: 100,
  NICKNAME_MAX_LENGTH: 50,
  ACCOUNT_NUMBER_MIN_LENGTH: 8,
  ACCOUNT_NUMBER_MAX_LENGTH: 20,
  BANK_NAME_MIN_LENGTH: 2,
  BANK_NAME_MAX_LENGTH: 100,
  REMINDER_DAYS_MIN: 1,
  REMINDER_DAYS_MAX: 30,
  DUE_DAYS_MIN: 1,
  DUE_DAYS_MAX: 365
};

export const REGEX_PATTERNS = {
  LAST_4_DIGITS: /^\d{4}$/,
  ACCOUNT_NUMBER: /^\d+$/,
  IFSC_CODE: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  UPI_ID: /^[\w.-]+@[\w.-]+$/,
  COUNTRY_CODE: /^[A-Z]{2}$/
};

export const ERROR_MESSAGES = {
  BILLING_PROFILE_NOT_FOUND: 'Billing profile not found',
  BILLING_PROFILE_EXISTS: 'Billing profile already exists for this customer',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  PAYMENT_NOT_FOUND: 'Payment not found',
  INVOICE_NOT_FOUND: 'Invoice not found',
  PAYMENT_METHOD_NOT_FOUND: 'Payment method not found',
  INSUFFICIENT_CREDIT: 'Insufficient credit balance',
  INVALID_BILLING_CYCLE: 'Invalid billing cycle',
  INVALID_AMOUNT: 'Amount must be greater than 0',
  INVALID_STATUS: 'Invalid status',
  INVALID_PAYMENT_METHOD_TYPE: 'Invalid payment method type',
  INVALID_CURRENCY: 'Invalid currency',
  INVALID_TAX_TYPE: 'Invalid tax type',
  INVALID_CARD_BRAND: 'Invalid card brand',
  INVALID_WALLET_PROVIDER: 'Invalid wallet provider',
  INVALID_IFSC_CODE: 'Invalid IFSC code format',
  INVALID_UPI_ID: 'Invalid UPI ID format',
  INVALID_ACCOUNT_NUMBER: 'Invalid account number format',
  MISSING_REQUIRED_FIELDS: 'Missing required fields',
  CARD_DETAILS_REQUIRED: 'Card details must include last4, brand, expiryMonth, and expiryYear',
  BANK_DETAILS_REQUIRED: 'Bank account details must include accountNumber, ifscCode, and bankName',
  WALLET_DETAILS_REQUIRED: 'Wallet details must include walletProvider',
  UPI_DETAILS_REQUIRED: 'UPI details must include upiId',
  EXPIRY_DATE_PAST: 'Expiration date must be in the future',
  EXEMPTION_REASON_REQUIRED: 'Exemption reason is required when exemption status is true',
  CANNOT_MODIFY_CANCELLED: 'Cannot modify cancelled subscription except to reactivate',
  MAX_RETRIES_EXCEEDED: 'Maximum retry attempts exceeded'
};

export const SUCCESS_MESSAGES = {
  INVOICE_GENERATED: 'Invoice generated successfully',
  PRORATION_INVOICE_GENERATED: 'Proration invoice generated successfully',
  BILLING_PROFILE_CREATED: 'Billing profile created successfully',
  BILLING_PROFILE_UPDATED: 'Billing profile updated successfully',
  BILLING_PROFILE_RETRIEVED: 'Billing profile retrieved successfully',
  PAYMENT_METHOD_ADDED: 'Payment method added successfully',
  PAYMENT_METHOD_REMOVED: 'Payment method removed successfully',
  DEFAULT_PAYMENT_METHOD_UPDATED: 'Default payment method updated successfully',
  INVOICES_RETRIEVED: 'Customer invoices retrieved successfully',
  RECURRING_BILLING_PROCESSED: 'Recurring billing processed successfully',
  RECURRING_BILLING_DRY_RUN: 'Recurring billing dry run completed',
  PAYMENT_FAILURE_HANDLED: 'Payment failure handled successfully',
  INVOICE_REMINDER_SENT: 'Invoice reminder sent successfully',
  STATISTICS_RETRIEVED: 'Billing statistics retrieved successfully',
  OVERDUE_INVOICES_RETRIEVED: 'Overdue invoices retrieved successfully'
};

export const RECURRING_BILLING_CONFIG = {
  CRON_SCHEDULE: '0 2 * * *', // Daily at 2:00 AM
  TIMEZONE: 'Asia/Kolkata',
  DEFAULT_BUFFER_HOURS: 24,
  DEFAULT_BATCH_SIZE: 50,
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_RETRY_DELAY: 5000, // 5 seconds
  EXPONENTIAL_BACKOFF_BASE: 2,
  MAX_PROCESSING_TIME: 3600000 // 1 hour in milliseconds
};

export const INVOICE_NUMBER_CONFIG = {
  PREFIX: 'INV',
  SEPARATOR: '-',
  TIMESTAMP_BASE: 36,
  RANDOM_LENGTH: 6
};

export const PRORATION_CONFIG = {
  MINIMUM_DAYS: 1,
  CALCULATION_PRECISION: 2, // Decimal places
  CREDIT_THRESHOLD: 0.01 // Minimum amount for credit note
};

export const PAYMENT_RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY: 3600000, // 1 hour
  EXPONENTIAL_BASE: 4, // 1h, 4h, 16h
  SUSPENSION_THRESHOLD: 3
};

export const NOTIFICATION_TYPES = {
  INVOICE_GENERATED: 'invoice_generated',
  INVOICE_DUE: 'invoice_due',
  INVOICE_OVERDUE: 'invoice_overdue',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_RETRY: 'payment_retry',
  SUBSCRIPTION_SUSPENDED: 'subscription_suspended',
  CREDIT_APPLIED: 'credit_applied'
};
