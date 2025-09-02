import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import * as billingService from '../../src/services/billingService.js';
import * as subscriptionRepository from '../../src/repository/subscriptionRepository.js';
import * as paymentRepository from '../../src/repository/paymentRepository.js';
import { BillingProfile } from '../../src/models/billingProfileModel.js';

// Mock dependencies
const mockSubscription = {
  _id: 'sub_123',
  subscriptionId: 'sub_123',
  customerId: 'cust_123',
  planId: 'plan_basic',
  planName: 'Basic Plan',
  billingCycle: 'monthly',
  amount: 1000,
  currency: 'INR',
  status: 'active',
  currentPeriodStart: new Date('2024-01-01'),
  currentPeriodEnd: new Date('2024-02-01'),
  nextBillingDate: new Date('2024-02-01'),
  toObject: () => mockSubscription
};

const mockBillingProfile = {
  _id: 'bp_123',
  customerId: 'cust_123',
  creditBalance: 100,
  billingAddress: {
    street: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    postalCode: '12345',
    country: 'IN'
  },
  taxInformation: {
    taxRate: 0.18
  },
  deductCredit: async (amount) => {
    mockBillingProfile.creditBalance -= amount;
  },
  addAuditEntry: async () => mockBillingProfile,
  toObject: () => mockBillingProfile
};

const mockPayment = {
  paymentId: 'pay_123',
  correlationId: 'corr_123',
  customerId: 'cust_123',
  amount: 900,
  status: 'pending',
  metadata: {
    invoiceData: {
      invoiceNumber: 'INV-123',
      subtotal: 1000,
      taxAmount: 180,
      creditApplied: 100,
      total: 1180,
      amountDue: 900
    }
  }
};

describe('Billing Service', () => {
  let originalFindSubscriptionById;
  let originalFindByCustomer;
  let originalCreatePaymentWithIdempotency;
  let originalFindPaymentByIdempotencyKey;

  beforeEach(() => {
    // Store original functions
    originalFindSubscriptionById = subscriptionRepository.findSubscriptionById;
    originalFindByCustomer = BillingProfile.findByCustomer;
    originalCreatePaymentWithIdempotency = paymentRepository.createPaymentWithIdempotency;
    originalFindPaymentByIdempotencyKey = paymentRepository.findPaymentByIdempotencyKey;

    // Mock repository functions
    subscriptionRepository.findSubscriptionById = async () => mockSubscription;
    BillingProfile.findByCustomer = async () => mockBillingProfile;
    paymentRepository.createPaymentWithIdempotency = async (payload) => ({
      ...mockPayment,
      ...payload
    });
    paymentRepository.findPaymentByIdempotencyKey = async () => null;
  });

  afterEach(() => {
    // Restore original functions
    subscriptionRepository.findSubscriptionById = originalFindSubscriptionById;
    BillingProfile.findByCustomer = originalFindByCustomer;
    paymentRepository.createPaymentWithIdempotency = originalCreatePaymentWithIdempotency;
    paymentRepository.findPaymentByIdempotencyKey = originalFindPaymentByIdempotencyKey;
  });

  describe('generateInvoice', () => {
    it('should generate invoice successfully', async () => {
      const subscriptionId = 'sub_123';
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const invoiceData = { dueDays: 30 };
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.generateInvoice(
        subscriptionId,
        correlationId,
        userId,
        invoiceData,
        requestContext
      );

      assert.strictEqual(result.isIdempotent, false);
      assert.ok(result.invoice);
      assert.strictEqual(result.invoice.correlationId, correlationId);
      assert.strictEqual(result.invoice.customerId, mockSubscription.customerId);
      assert.ok(result.invoice.metadata.invoiceData);
    });

    it('should return existing invoice for idempotent request', async () => {
      // Mock existing invoice
      paymentRepository.findPaymentByIdempotencyKey = async () => ({
        ...mockPayment,
        metadata: { invoiceData: { invoiceNumber: 'INV-EXISTING' } }
      });

      const subscriptionId = 'sub_123';
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const invoiceData = { dueDays: 30 };
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.generateInvoice(
        subscriptionId,
        correlationId,
        userId,
        invoiceData,
        requestContext
      );

      assert.strictEqual(result.isIdempotent, true);
      assert.ok(result.invoice);
      assert.strictEqual(result.invoice.metadata.invoiceData.invoiceNumber, 'INV-EXISTING');
    });

    it('should apply credit balance to invoice', async () => {
      const subscriptionId = 'sub_123';
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const invoiceData = { dueDays: 30 };
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.generateInvoice(
        subscriptionId,
        correlationId,
        userId,
        invoiceData,
        requestContext
      );

      const invoiceMetadata = result.invoice.metadata.invoiceData;
      assert.strictEqual(invoiceMetadata.creditApplied, 100);
      assert.strictEqual(invoiceMetadata.amountDue, invoiceMetadata.total - 100);
    });
  });

  describe('generateProrationInvoice', () => {
    it('should generate proration invoice for plan upgrade', async () => {
      const subscriptionId = 'sub_123';
      const changes = { planName: 'Premium Plan', amount: 2000 };
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      // Mock current date to be in the middle of billing period
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super('2024-01-15'); // Middle of the period
          } else {
            super(...args);
          }
        }
        static now() {
          return new Date('2024-01-15').getTime();
        }
      };

      paymentRepository.createPayment = async (payload) => ({
        ...mockPayment,
        ...payload
      });

      const result = await billingService.generateProrationInvoice(
        subscriptionId,
        changes,
        correlationId,
        userId,
        requestContext
      );

      assert.ok(result);
      assert.ok(result.metadata.invoiceData);
      assert.strictEqual(result.metadata.invoiceData.type, 'proration_invoice');
      assert.ok(result.metadata.invoiceData.prorationDetails);

      // Restore Date
      global.Date = originalDate;
    });

    it('should return null when no proration is needed', async () => {
      const subscriptionId = 'sub_123';
      const changes = { planName: 'Same Plan', amount: 1000 }; // Same amount
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      // Mock current date to be at the end of billing period
      const originalDate = Date;
      global.Date = class extends Date {
        constructor(...args) {
          if (args.length === 0) {
            super('2024-02-01'); // End of the period
          } else {
            super(...args);
          }
        }
        static now() {
          return new Date('2024-02-01').getTime();
        }
      };

      const result = await billingService.generateProrationInvoice(
        subscriptionId,
        changes,
        correlationId,
        userId,
        requestContext
      );

      assert.strictEqual(result, null);

      // Restore Date
      global.Date = originalDate;
    });
  });

  describe('createBillingProfile', () => {
    it('should create billing profile successfully', async () => {
      BillingProfile.findByCustomer = async () => null; // No existing profile
      BillingProfile.createProfile = async (customerId, data) => ({
        ...mockBillingProfile,
        customerId,
        ...data,
        addAuditEntry: async () => mockBillingProfile
      });

      const customerId = 'cust_123';
      const profileData = {
        billingAddress: mockBillingProfile.billingAddress,
        taxInformation: mockBillingProfile.taxInformation
      };
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.createBillingProfile(
        customerId,
        profileData,
        correlationId,
        userId,
        requestContext
      );

      assert.ok(result);
      assert.strictEqual(result.customerId, customerId);
    });
  });

  describe('processRecurringBilling', () => {
    it('should process recurring billing successfully', async () => {
      subscriptionRepository.findSubscriptionsDueForRenewal = async () => [mockSubscription];

      const correlationId = 'corr_123';
      const userId = 'user_123';
      const options = { bufferHours: 24, dryRun: false };

      const result = await billingService.processRecurringBilling(correlationId, userId, options);

      assert.ok(result);
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.processed, 1);
      assert.strictEqual(result.failed, 0);
      assert.strictEqual(result.skipped, 0);
    });

    it('should return dry run results without processing', async () => {
      subscriptionRepository.findSubscriptionsDueForRenewal = async () => [mockSubscription];

      const correlationId = 'corr_123';
      const userId = 'user_123';
      const options = { bufferHours: 24, dryRun: true };

      const result = await billingService.processRecurringBilling(correlationId, userId, options);

      assert.ok(result);
      assert.strictEqual(result.total, 1);
      assert.strictEqual(result.processed, 0);
      assert.strictEqual(result.details[0].status, 'would_bill');
    });
  });

  describe('handlePaymentFailure', () => {
    it('should schedule retry for failed payment', async () => {
      const mockPaymentWithRetry = {
        ...mockPayment,
        retryCount: 1
      };

      paymentRepository.findPaymentById = async () => mockPaymentWithRetry;
      paymentRepository.updatePaymentById = async (id, updates) => ({
        ...mockPaymentWithRetry,
        ...updates
      });
      subscriptionRepository.updateSubscriptionById = async (id, updates) => ({
        ...mockSubscription,
        ...updates
      });

      const subscriptionId = 'sub_123';
      const paymentId = 'pay_123';
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const failureData = { reason: 'Insufficient funds' };
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.handlePaymentFailure(
        subscriptionId,
        paymentId,
        correlationId,
        userId,
        failureData,
        requestContext
      );

      assert.ok(result);
      assert.strictEqual(result.action, 'retry_scheduled');
      assert.strictEqual(result.retryCount, 2);
    });

    it('should suspend subscription after max retries', async () => {
      const mockPaymentMaxRetries = {
        ...mockPayment,
        retryCount: 3 // Max retries reached
      };

      paymentRepository.findPaymentById = async () => mockPaymentMaxRetries;
      paymentRepository.updatePaymentById = async (id, updates) => ({
        ...mockPaymentMaxRetries,
        ...updates
      });
      subscriptionRepository.updateSubscriptionById = async (id, updates) => ({
        ...mockSubscription,
        ...updates
      });

      const subscriptionId = 'sub_123';
      const paymentId = 'pay_123';
      const correlationId = 'corr_123';
      const userId = 'user_123';
      const failureData = { reason: 'Card expired' };
      const requestContext = { ipAddress: '127.0.0.1', userAgent: 'test' };

      const result = await billingService.handlePaymentFailure(
        subscriptionId,
        paymentId,
        correlationId,
        userId,
        failureData,
        requestContext
      );

      assert.ok(result);
      assert.strictEqual(result.action, 'subscription_suspended');
      assert.strictEqual(result.retryCount, 4);
    });
  });
});
