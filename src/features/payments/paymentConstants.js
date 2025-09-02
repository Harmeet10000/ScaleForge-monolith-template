// Payment Status Constants
export const EPaymentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  CANCELLED: 'cancelled'
};

// Subscription Status Constants
export const ESubscriptionStatus = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  SUSPENDED: 'suspended',
  PENDING: 'pending'
};

// Billing Cycle Constants
export const EBillingCycle = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  ANNUAL: 'annual'
};

// Payment Method Types
export const EPaymentMethodType = {
  CARD: 'card',
  BANK_ACCOUNT: 'bank_account',
  WALLET: 'wallet',
  UPI: 'upi'
};

// Currency Constants
export const ECurrency = {
  INR: 'INR',
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP'
};

// Audit Operation Types (used in embedded audit trails)
export const EAuditOperationType = {
  PAYMENT_CREATE: 'payment_create',
  PAYMENT_UPDATE: 'payment_update',
  PAYMENT_VERIFY: 'payment_verify',
  PAYMENT_REFUND: 'payment_refund',
  PAYMENT_CANCEL: 'payment_cancel',
  SUBSCRIPTION_CREATE: 'subscription_create',
  SUBSCRIPTION_UPDATE: 'subscription_update',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
  SUBSCRIPTION_RENEW: 'subscription_renew',
  SUBSCRIPTION_SUSPEND: 'subscription_suspend',
  BILLING_PROFILE_CREATE: 'billing_profile_create',
  BILLING_PROFILE_UPDATE: 'billing_profile_update',
  PAYMENT_METHOD_ADD: 'payment_method_add',
  PAYMENT_METHOD_REMOVE: 'payment_method_remove',
  PAYMENT_METHOD_UPDATE: 'payment_method_update'
};

// Audit Status (used in embedded audit trails)
export const EAuditStatus = {
  SUCCESS: 'success',
  FAILURE: 'failure',
  ERROR: 'error'
};

// Tax Information Types
export const ETaxType = {
  GST: 'GST',
  PAN: 'PAN',
  VAT: 'VAT',
  SSN: 'SSN',
  EIN: 'EIN'
};

// Invoice Delivery Methods
export const EInvoiceDelivery = {
  EMAIL: 'email',
  POSTAL: 'postal'
};

// Retry Configuration
export const RETRY_CONFIG = {
  PAYMENT: {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000, // 1 second
    MAX_DELAY: 30000, // 30 seconds
    BACKOFF_MULTIPLIER: 2
  },
  SUBSCRIPTION: {
    MAX_RETRIES: 5,
    BASE_DELAY: 2000, // 2 seconds
    MAX_DELAY: 60000, // 60 seconds
    BACKOFF_MULTIPLIER: 1.5
  },
  WEBHOOK: {
    MAX_RETRIES: 3,
    BASE_DELAY: 5000, // 5 seconds
    MAX_DELAY: 120000, // 2 minutes
    BACKOFF_MULTIPLIER: 2
  }
};

// TTL Configuration (in hours)
export const TTL_CONFIG = {
  PAYMENT_EXPIRY: 24 // 24 hours
};

// Razorpay Webhook Events
export const ERazorpayWebhookEvent = {
  PAYMENT_AUTHORIZED: 'payment.authorized',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_CAPTURED: 'payment.captured',
  ORDER_PAID: 'order.paid',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',
  SUBSCRIPTION_CHARGED: 'subscription.charged',
  SUBSCRIPTION_COMPLETED: 'subscription.completed',
  SUBSCRIPTION_UPDATED: 'subscription.updated',
  REFUND_CREATED: 'refund.created',
  REFUND_PROCESSED: 'refund.processed'
};

// Default Values
export const DEFAULT_VALUES = {
  CURRENCY: ECurrency.INR,
  BILLING_CYCLE: EBillingCycle.MONTHLY,
  REMINDER_DAYS: 7,
  LANGUAGE: 'en',
  INVOICE_DELIVERY: EInvoiceDelivery.EMAIL,
  AUTO_RENEWAL: true,
  CREDIT_BALANCE: 0,
  TOTAL_SPENT: 0
};
