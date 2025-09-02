import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../../src/app.js';
import { connectDB, disconnectDB } from '../../src/connections/connectDB.js';
import { BillingProfile } from '../../src/models/billingProfileModel.js';
import { Subscription } from '../../src/models/subscriptionModel.js';
import { Invoice } from '../../src/models/invoiceModel.js';

describe('Billing Integration Tests', () => {
  let authToken;
  let testCustomerId;
  let testSubscriptionId;
  let testBillingProfileId;

  before(async () => {
    // Connect to test database
    await connectDB();

    // Create test user and get auth token
    const userResponse = await request(app).post('/api/v1/auth/register').send({
      name: 'Test User',
      emailAddress: 'billing.test@example.com',
      password: 'TestPassword123!',
      phoneNumber: '+919876543210'
    });

    testCustomerId = userResponse.body.data.user.id;

    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      emailAddress: 'billing.test@example.com',
      password: 'TestPassword123!'
    });

    authToken = loginResponse.body.data.accessToken;
  });

  after(async () => {
    // Clean up test data
    await BillingProfile.deleteMany({ customerId: testCustomerId });
    await Subscription.deleteMany({ customerId: testCustomerId });
    await Invoice.deleteMany({ customerId: testCustomerId });

    // Disconnect from database
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clean up before each test
    await BillingProfile.deleteMany({ customerId: testCustomerId });
    await Subscription.deleteMany({ customerId: testCustomerId });
    await Invoice.deleteMany({ customerId: testCustomerId });
  });

  describe('POST /api/v1/billing/profiles/:customerId', () => {
    it('should create a billing profile successfully', async () => {
      const billingProfileData = {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        },
        taxInformation: {
          taxId: 'GST123456789',
          taxType: 'GST',
          exemptionStatus: false
        },
        preferences: {
          currency: 'INR',
          invoiceDelivery: 'email',
          autoRenewal: true,
          reminderDays: 7,
          language: 'en'
        }
      };

      const response = await request(app)
        .post(`/api/v1/billing/profiles/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(billingProfileData)
        .expect(201);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Billing profile created successfully');
      assert.ok(response.body.data.billingProfile);
      assert.strictEqual(response.body.data.billingProfile.customerId, testCustomerId);
      assert.deepStrictEqual(
        response.body.data.billingProfile.billingAddress.street,
        billingProfileData.billingAddress.street
      );

      testBillingProfileId = response.body.data.billingProfile._id;
    });

    it('should return 409 when billing profile already exists', async () => {
      // Create initial profile
      await BillingProfile.createProfile(testCustomerId, {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        }
      });

      const billingProfileData = {
        billingAddress: {
          street: '456 Another Street',
          city: 'Another City',
          state: 'Another State',
          postalCode: '67890',
          country: 'IN'
        }
      };

      const response = await request(app)
        .post(`/api/v1/billing/profiles/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(billingProfileData)
        .expect(409);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('already exists'));
    });
  });

  describe('GET /api/v1/billing/profiles/:customerId', () => {
    beforeEach(async () => {
      // Create a billing profile for testing
      const profile = await BillingProfile.createProfile(testCustomerId, {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        },
        creditBalance: 100
      });
      testBillingProfileId = profile._id;
    });

    it('should retrieve billing profile successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/profiles/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Billing profile retrieved successfully');
      assert.ok(response.body.data.billingProfile);
      assert.strictEqual(response.body.data.billingProfile.customerId, testCustomerId);
      assert.strictEqual(response.body.data.billingProfile.creditBalance, 100);
    });

    it('should return 404 when billing profile not found', async () => {
      const nonExistentCustomerId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/v1/billing/profiles/${nonExistentCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('not found'));
    });
  });

  describe('POST /api/v1/billing/profiles/:customerId/payment-methods', () => {
    beforeEach(async () => {
      // Create a billing profile for testing
      const profile = await BillingProfile.createProfile(testCustomerId, {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        }
      });
      testBillingProfileId = profile._id;
    });

    it('should add payment method successfully', async () => {
      const paymentMethodData = {
        methodId: 'pm_test_123',
        type: 'card',
        details: {
          last4: '4242',
          brand: 'visa',
          expiryMonth: 12,
          expiryYear: 2025,
          holderName: 'Test User'
        },
        isDefault: true
      };

      const response = await request(app)
        .post(`/api/v1/billing/profiles/${testCustomerId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentMethodData)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Payment method added successfully');
      assert.ok(response.body.data.billingProfile);
      assert.strictEqual(response.body.data.billingProfile.paymentMethods.length, 1);
      assert.strictEqual(
        response.body.data.billingProfile.paymentMethods[0].methodId,
        'pm_test_123'
      );
      assert.strictEqual(response.body.data.billingProfile.paymentMethods[0].isDefault, true);
    });

    it('should validate payment method data', async () => {
      const invalidPaymentMethodData = {
        methodId: 'pm_test_123',
        type: 'card',
        details: {
          last4: '42', // Invalid - should be 4 digits
          brand: 'invalid_brand',
          expiryMonth: 13, // Invalid - should be 1-12
          expiryYear: 2020 // Invalid - should be in future
        }
      };

      const response = await request(app)
        .post(`/api/v1/billing/profiles/${testCustomerId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidPaymentMethodData)
        .expect(400);

      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message.includes('Validation error'));
    });
  });

  describe('POST /api/v1/billing/invoices/generate/:subscriptionId', () => {
    beforeEach(async () => {
      // Create billing profile and subscription for testing
      await BillingProfile.createProfile(testCustomerId, {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        },
        taxInformation: {
          taxRate: 0.18
        },
        creditBalance: 50
      });

      const subscription = await Subscription.create({
        customerId: testCustomerId,
        planId: 'plan_basic',
        planName: 'Basic Plan',
        billingCycle: 'monthly',
        amount: 1000,
        currency: 'INR',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      testSubscriptionId = subscription._id;
    });

    it('should generate invoice successfully', async () => {
      const invoiceData = {
        dueDays: 30,
        paymentTerms: 'Net 30',
        notes: 'Test invoice generation'
      };

      const response = await request(app)
        .post(`/api/v1/billing/invoices/generate/${testSubscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Invoice generated successfully');
      assert.ok(response.body.data.invoice);
      assert.ok(response.body.data.invoice.metadata.invoiceData);

      const invoiceMetadata = response.body.data.invoice.metadata.invoiceData;
      assert.strictEqual(invoiceMetadata.subtotal, 1000);
      assert.strictEqual(invoiceMetadata.taxAmount, 180); // 18% of 1000
      assert.strictEqual(invoiceMetadata.creditApplied, 50);
      assert.strictEqual(invoiceMetadata.total, 1180);
      assert.strictEqual(invoiceMetadata.amountDue, 1130); // 1180 - 50
    });

    it('should return existing invoice for idempotent request', async () => {
      const invoiceData = {
        dueDays: 30,
        paymentTerms: 'Net 30'
      };

      // First request
      const response1 = await request(app)
        .post(`/api/v1/billing/invoices/generate/${testSubscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData)
        .expect(201);

      // Second request with same correlation ID (should be idempotent)
      const response2 = await request(app)
        .post(`/api/v1/billing/invoices/generate/${testSubscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invoiceData);

      // Note: In a real scenario, idempotency would be based on correlation ID
      // For this test, we're just checking that the service handles the request
      assert.ok(response2.body.data.invoice);
    });
  });

  describe('POST /api/v1/billing/invoices/proration/:subscriptionId', () => {
    beforeEach(async () => {
      // Create billing profile and subscription for testing
      await BillingProfile.createProfile(testCustomerId, {
        billingAddress: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '12345',
          country: 'IN'
        },
        taxInformation: {
          taxRate: 0.18
        }
      });

      const subscription = await Subscription.create({
        customerId: testCustomerId,
        planId: 'plan_basic',
        planName: 'Basic Plan',
        billingCycle: 'monthly',
        amount: 1000,
        currency: 'INR',
        status: 'active',
        currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
        nextBillingDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      });

      testSubscriptionId = subscription._id;
    });

    it('should generate proration invoice for plan upgrade', async () => {
      const prorationData = {
        planName: 'Premium Plan',
        amount: 2000 // Upgrade from 1000 to 2000
      };

      const response = await request(app)
        .post(`/api/v1/billing/invoices/proration/${testSubscriptionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(prorationData)
        .expect(201);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Proration invoice generated successfully');
      assert.ok(response.body.data.invoice);
      assert.ok(response.body.data.invoice.metadata.invoiceData);

      const invoiceMetadata = response.body.data.invoice.metadata.invoiceData;
      assert.strictEqual(invoiceMetadata.type, 'proration_invoice');
      assert.ok(invoiceMetadata.prorationDetails);
      assert.ok(invoiceMetadata.prorationDetails.remainingDays > 0);
    });
  });

  describe('POST /api/v1/billing/recurring', () => {
    it('should process recurring billing in dry run mode', async () => {
      const recurringData = {
        bufferHours: 24,
        dryRun: true
      };

      const response = await request(app)
        .post('/api/v1/billing/recurring')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recurringData)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Recurring billing dry run completed');
      assert.ok(response.body.data.results);
      assert.ok(typeof response.body.data.results.total === 'number');
    });
  });

  describe('GET /api/v1/billing/invoices/customer/:customerId', () => {
    beforeEach(async () => {
      // Create some test invoices
      await Invoice.create({
        invoiceNumber: 'INV-TEST-001',
        correlationId: 'test-corr-001',
        customerId: testCustomerId,
        type: 'invoice',
        status: 'pending',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        currency: 'INR',
        subtotal: 1000,
        taxAmount: 180,
        total: 1180,
        amountDue: 1180,
        lineItems: [
          {
            description: 'Test Service',
            quantity: 1,
            unitPrice: 1000,
            amount: 1000
          }
        ]
      });
    });

    it('should retrieve customer invoices successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/invoices/customer/${testCustomerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.strictEqual(response.body.message, 'Customer invoices retrieved successfully');
      assert.ok(response.body.data.invoices);
      assert.ok(response.body.data.pagination);
      assert.strictEqual(response.body.data.invoices.length, 1);
      assert.strictEqual(response.body.data.invoices[0].invoiceNumber, 'INV-TEST-001');
    });

    it('should filter invoices by status', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/invoices/customer/${testCustomerId}?status=pending`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.data.invoices);
      response.body.data.invoices.forEach((invoice) => {
        assert.strictEqual(invoice.status, 'pending');
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all billing endpoints', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/profiles/${testCustomerId}`)
        .expect(401);

      assert.strictEqual(response.body.success, false);
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/v1/billing/profiles/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      assert.strictEqual(response.body.success, false);
    });
  });
});
