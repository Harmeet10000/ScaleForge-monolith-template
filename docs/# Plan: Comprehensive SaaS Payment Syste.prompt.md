# Plan: Comprehensive SaaS Payment System with ACID Transactions

## Overview

Enhance the existing Razorpay payment infrastructure with MongoDB ACID multi-document transactions to ensure consistency across payment, subscription, and audit operations. Implement session-based transactional flows leveraging MongoDB's replica set configuration, add transactional wrappers in the repository layer, and coordinate atomic updates across payment, subscription, user, and audit documents using write concern majority.

## Implementation Steps

### Step 1: Add Transaction Session Management

**File:** `src/connections/connectDB.js`

**Objective:** Create utility functions for managing MongoDB sessions with automatic lifecycle management and rollback on error.

**Details:**
- Export `startSession()` function that creates a new session with majority write concern
- Export `withTransaction()` wrapper function that:
  - Creates a session if none provided
  - Wraps the callback function in a transaction
  - Handles automatic rollback on errors
  - Cleans up session resources
  - Returns the callback result or throws error
- Configure session timeout to 60 seconds (configurable via environment variable)
- Implement automatic session cleanup in disconnect handler
- Log transaction lifecycle events (start, commit, abort)

**Key Implementation:**
```javascript
export const startSession = asyncHandler(async () => {
  const session = await mongoose.startSession();
  session.startTransaction({
    readConcern: { level: 'majority' },
    writeConcern: { w: 'majority', j: true },
    readPreference: 'primary',
    maxCommitTimeMS: process.env.TRANSACTION_TIMEOUT_MS || 60000
  });
  return session;
});

export const withTransaction = asyncHandler(async (callback, options = {}) => {
  const session = await startSession();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
});
```

---

### Step 2: Create Transaction Utility Layer

**File:** `src/utils/transactionManager.js` (NEW)

**Objective:** Provide reusable transaction wrappers with error handling, logging, and support for nested service calls.

**Details:**
- Export `executeInTransaction(callback, options)` that wraps business logic in a transaction
- Support `options.session` to allow reusing existing session (for nested operations)
- Support `options.sessionTimeout` to override default timeout per operation
- Support `options.transactionName` for logging context
- Implement retry logic for transient transaction errors (100ms exponential backoff, max 3 retries)
- Log transaction start, commit, and abort with correlationId and operation name
- Provide `getActiveSession()` to retrieve current session from async local storage (if implemented)
- Handle timeout errors with specific message for monitoring

**Key Implementation:**
```javascript
export const executeInTransaction = asyncHandler(
  async (callback, { session = null, sessionTimeout = null, transactionName = 'unknown' } = {}) => {
    let ownSession = false;
    let currentSession = session;

    if (!currentSession) {
      currentSession = await startSession();
      ownSession = true;
    }

    try {
      const result = await callback(currentSession);
      if (ownSession) {
        await currentSession.commitTransaction();
      }
      logger.debug(`Transaction committed: ${transactionName}`, { meta: { transactionName } });
      return result;
    } catch (error) {
      if (ownSession) {
        await currentSession.abortTransaction();
      }
      logger.error(`Transaction aborted: ${transactionName}`, {
        meta: { transactionName, error: error.message }
      });
      throw error;
    } finally {
      if (ownSession) {
        await currentSession.endSession();
      }
    }
  }
);
```

---

### Step 3: Update Repository Methods with Session Support

**Files:** 
- `src/features/payments/paymentRepository.js`
- `src/features/subscription/subscriptionRepository.js`
- `src/features/audit/auditRepository.js`

**Objective:** Modify all CRUD operations to accept optional session parameter for transactional use.

**Details:**
- Update all `create` methods: `async (data, session = null)` → pass session to `.save()`
- Update all `update` methods: `async (id, updates, session = null)` → pass session to `.findByIdAndUpdate()` with `{ session }`
- Update all `delete` methods: `async (id, session = null)` → pass session to deletion query
- Ensure `find` operations pass session even for read queries within transactions
- Maintain backward compatibility: session is optional, operations work without it
- Document which methods participate in transactions in JSDoc comments

**Pattern for Payment Repository:**
```javascript
export const updatePaymentStatus = asyncHandler(
  async (paymentId, status, additionalData = {}, session = null) => {
    const updateData = {
      status,
      ...additionalData
    };

    if (status === EPaymentStatus.COMPLETED && !additionalData.completedAt) {
      updateData.completedAt = new Date();
    }

    const options = { new: true, runValidators: true };
    if (session) options.session = session;

    return await Payment.findByIdAndUpdate(paymentId, updateData, options);
  }
);

export const addPaymentAuditEntry = asyncHandler(
  async (paymentId, operation, operationType, userId, details, ipAddress, userAgent, status, errorMessage, session = null) => {
    const payment = await Payment.findById(paymentId).session(session || null);
    if (!payment) {
      throw new httpError('Payment not found', 404);
    }

    await payment.addAuditEntry(
      operation,
      operationType,
      userId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    );

    if (session) {
      await payment.save({ session });
    } else {
      await payment.save();
    }

    return payment;
  }
);
```

---

### Step 4: Implement Atomic Payment Workflows

**File:** `src/features/payments/paymentService.js`

**Objective:** Update payment verification and processing to use transactions ensuring payment, subscription, and audit consistency.

**Details:**
- Update `verifyPayment()` to wrap entire verification flow in transaction:
  - Find/verify payment with Razorpay signature
  - Update payment status to COMPLETED
  - If subscription exists, update subscription status to ACTIVE
  - Create audit entry for payment completion
  - All in single atomic operation
- Add `processPaymentCompletion(paymentId, razorpayPaymentId, correlationId, session)` method:
  - Updates payment with Razorpay payment ID and completion timestamp
  - Updates subscription if linked
  - Creates comprehensive audit entry
  - Returns updated payment and subscription
- Update `retryPayment()` to use transactions:
  - Increment retry count atomically with status update
  - Log audit entry atomically
  - Prevents race condition where retry counter and status are inconsistent
- Update `processPaymentFailure()` to atomically update:
  - Payment status to FAILED
  - Subscription status to SUSPENDED (if auto-renewal failed)
  - Audit entry with failure reason
- Implement idempotent transaction checks: verify idempotency key before starting transaction

**Key Implementation:**
```javascript
export const verifyPayment = asyncHandler(
  async (paymentData, correlationId, userId, requestContext = {}, req) => {
    // Check idempotency first (before transaction)
    const existingVerification = await paymentRepository.findPaymentByCorrelationId(correlationId);
    if (existingVerification?.status === EPaymentStatus.COMPLETED) {
      logger.info('Payment already verified, returning cached result', {
        meta: { correlationId, paymentId: existingVerification._id }
      });
      return { payment: existingVerification, isIdempotent: true };
    }

    // Execute verification in transaction
    const result = await executeInTransaction(
      async (session) => {
        // Verify Razorpay signature
        const isValid = verifyRazorpaySignature(
          paymentData.razorpayOrderId,
          paymentData.razorpayPaymentId,
          paymentData.razorpaySignature
        );

        if (!isValid) {
          throw new Error('Invalid Razorpay signature');
        }

        // Find payment
        const payment = await paymentRepository.findPaymentById(paymentData.paymentId, session);
        if (!payment) {
          throw new httpError('Payment not found', 404);
        }

        // Update payment status
        const updatedPayment = await paymentRepository.updatePaymentStatus(
          payment._id,
          EPaymentStatus.COMPLETED,
          {
            razorpayPaymentId: paymentData.razorpayPaymentId,
            completedAt: new Date()
          },
          session
        );

        // Update subscription if linked
        if (payment.subscriptionId) {
          await subscriptionRepository.updateSubscriptionStatus(
            payment.subscriptionId,
            'active',
            session
          );
        }

        // Add audit entry
        await paymentRepository.addPaymentAuditEntry(
          payment._id,
          'Payment verified and completed',
          'payment_verified',
          userId,
          { razorpayPaymentId: paymentData.razorpayPaymentId },
          requestContext.ipAddress,
          requestContext.userAgent,
          'success',
          null,
          session
        );

        return { payment: updatedPayment, subscription: payment.subscriptionId ? { updated: true } : null };
      },
      { transactionName: `verify_payment_${correlationId}` }
    );

    logger.info('Payment verified successfully', {
      meta: { correlationId, paymentId: result.payment._id }
    });

    return result;
  }
);

export const retryPayment = asyncHandler(
  async (paymentId, correlationId, userId, requestContext = {}, req) => {
    const result = await executeInTransaction(
      async (session) => {
        // Find payment and check if it can be retried
        const payment = await paymentRepository.findPaymentById(paymentId, session);
        if (!payment) {
          throw new httpError('Payment not found', 404);
        }

        if (!payment.canRetry(RETRY_CONFIG.MAX_RETRIES)) {
          throw new httpError('Payment retry limit exceeded', 400);
        }

        // Increment retry count and update status atomically
        const updatedPayment = await paymentRepository.updatePaymentById(
          paymentId,
          { retryCount: payment.retryCount + 1, status: EPaymentStatus.PROCESSING },
          session
        );

        // Add audit entry
        await paymentRepository.addPaymentAuditEntry(
          paymentId,
          `Payment retry attempt ${updatedPayment.retryCount}`,
          'payment_retry',
          userId,
          { retryCount: updatedPayment.retryCount },
          requestContext.ipAddress,
          requestContext.userAgent,
          'processing',
          null,
          session
        );

        return updatedPayment;
      },
      { transactionName: `retry_payment_${correlationId}` }
    );

    return result;
  }
);
```

---

### Step 5: Add Transactional Subscription Renewal

**File:** `src/features/subscription/subscriptionService.js`

**Objective:** Ensure subscription renewal updates are atomic with payment creation and audit logging.

**Details:**
- Create `renewSubscription(subscriptionId, correlationId, userId, session)` method:
  - Find subscription and verify it's eligible for renewal
  - Calculate next billing period dates
  - Update subscription status to ACTIVE
  - Update next billing date
  - Create payment order through Razorpay
  - Create audit entry with renewal details
  - Return subscription and payment order in single atomic operation
- Add `updateSubscriptionStatus(subscriptionId, newStatus, metadata, session)` for atomic status changes:
  - Updates subscription status
  - Updates relevant timestamps based on status (cancellation date, suspension reason, etc.)
  - Creates audit entry
  - All in single transaction
- Implement `handleSubscriptionExpiry(subscriptionId, session)`:
  - Updates subscription status to EXPIRED
  - Marks for deletion or archival
  - Notifies customer
  - Creates audit entry
- Implement idempotent renewal: use correlationId to check if renewal already initiated

**Key Implementation:**
```javascript
export const renewSubscription = asyncHandler(
  async (subscriptionId, correlationId, userId, requestContext = {}, session = null) => {
    const result = await executeInTransaction(
      async (txSession) => {
        // Find subscription
        const subscription = await subscriptionRepository.findSubscriptionById(
          subscriptionId,
          txSession
        );

        if (!subscription) {
          throw new httpError('Subscription not found', 404);
        }

        if (subscription.status !== 'active' && subscription.status !== 'expired') {
          throw new httpError(
            `Cannot renew subscription with status: ${subscription.status}`,
            400
          );
        }

        // Calculate new billing dates
        const billingDates = calculateBillingDates(
          subscription.billingCycle,
          subscription.currentPeriodEnd
        );

        // Update subscription
        const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
          subscriptionId,
          {
            status: 'active',
            currentPeriodStart: billingDates.periodStart,
            currentPeriodEnd: billingDates.periodEnd,
            nextBillingDate: billingDates.nextBilling
          },
          txSession
        );

        // Create renewal payment order
        const paymentData = {
          customerId: subscription.customerId,
          subscriptionId: subscription._id,
          amount: subscription.amount,
          currency: subscription.currency,
          metadata: {
            renewalType: 'subscription_renewal',
            planId: subscription.planId,
            billingCycle: subscription.billingCycle
          }
        };

        const paymentOrder = await paymentRepository.createPaymentWithIdempotency(
          {
            ...paymentData,
            correlationId,
            status: EPaymentStatus.PENDING
          },
          `${correlationId}_renewal`,
          crypto
            .createHash('sha256')
            .update(JSON.stringify(paymentData))
            .digest('hex')
            .substring(0, 16),
          txSession
        );

        // Add audit entry
        await subscriptionRepository.addSubscriptionAuditEntry(
          subscriptionId,
          'Subscription renewed',
          'subscription_renewed',
          userId,
          {
            renewalPaymentId: paymentOrder._id,
            newBillingDates: billingDates
          },
          requestContext.ipAddress,
          requestContext.userAgent,
          'success',
          null,
          txSession
        );

        return { subscription: updatedSubscription, paymentOrder };
      },
      { session, transactionName: `renew_subscription_${correlationId}` }
    );

    logger.info('Subscription renewed successfully', {
      meta: { correlationId, subscriptionId, paymentId: result.paymentOrder._id }
    });

    return result;
  }
);

export const updateSubscriptionStatus = asyncHandler(
  async (subscriptionId, newStatus, metadata = {}, userId, requestContext = {}, session = null) => {
    const result = await executeInTransaction(
      async (txSession) => {
        const subscription = await subscriptionRepository.findSubscriptionById(
          subscriptionId,
          txSession
        );

        if (!subscription) {
          throw new httpError('Subscription not found', 404);
        }

        const statusUpdate = { status: newStatus };

        // Add status-specific timestamps
        if (newStatus === 'cancelled') {
          statusUpdate.cancelledAt = new Date();
        } else if (newStatus === 'suspended') {
          statusUpdate.suspendedAt = new Date();
        } else if (newStatus === 'active') {
          statusUpdate.suspendedAt = null;
        }

        // Update subscription
        const updatedSubscription = await subscriptionRepository.updateSubscriptionById(
          subscriptionId,
          { ...statusUpdate, ...metadata },
          txSession
        );

        // Add audit entry
        await subscriptionRepository.addSubscriptionAuditEntry(
          subscriptionId,
          `Subscription status changed to ${newStatus}`,
          `subscription_${newStatus}`,
          userId,
          { previousStatus: subscription.status, metadata },
          requestContext.ipAddress,
          requestContext.userAgent,
          'success',
          null,
          txSession
        );

        return updatedSubscription;
      },
      { session, transactionName: `update_subscription_status_${subscriptionId}_${newStatus}` }
    );

    return result;
  }
);
```

---

### Step 6: Create Webhook Transaction Handler

**Files:** 
- `src/features/payments/paymentController.js` (new endpoint `/webhooks/razorpay`)
- `src/features/payments/webhookService.js` (NEW)
- Create RabbitMQ event consumer in `src/helpers/messaging/paymentEventConsumer.js` (NEW)

**Objective:** Process Razorpay webhooks with atomic transaction support and event publishing for downstream processing.

**Details:**
- Add `POST /api/v1/payments/webhooks/razorpay` endpoint (public, no auth required):
  - Extract webhook signature from headers
  - Verify signature using RAZORPAY_WEBHOOK_SECRET
  - Reject with 403 if signature invalid
  - Extract event type and data
  - Use `executeInTransaction()` to process webhook atomically
  - Publish event to RabbitMQ queue for async processing
  - Return 200 immediately (webhook ack)

- Create `webhookService.js` with `processWebhookEvent(event, session)`:
  - Routes to specific handlers based on event type:
    - `payment.authorized` → Update payment status, check subscription
    - `payment.failed` → Update payment status, suspend subscription, retry
    - `payment.captured` → Mark payment complete, activate subscription
    - `subscription.completed` → Update subscription to expired, log completion
    - `subscription.halted` → Suspend subscription, log failure
  - Each handler uses provided session for transactionality
  - Returns event processing result

- Implement `verifyWebhookSignature(payload, signature)`:
  - Create HMAC-SHA256 hash of raw request body with webhook secret
  - Compare with provided signature
  - Return boolean

- Create RabbitMQ consumer that listens to payment events:
  - Subscribes to queues: `payment.completed`, `payment.failed`, `subscription.renewed`
  - For each event, triggers downstream actions (email, invoice, notification)
  - Implements idempotency using correlationId
  - Publishes to dead-letter queue on persistent failures
  - Logs event processing with correlationId

- Implement webhook event logging:
  - Create dedicated `WebhookLog` model to track all webhook attempts
  - Store: timestamp, event type, signature verification result, processing status, error if any
  - Use for debugging and compliance audits

**Key Implementation:**
```javascript
// In paymentController.js
export const handleRazorpayWebhook = asyncHandler(async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];
  const body = req.rawBody; // Ensure raw body is available

  // Verify webhook signature
  const isValid = verifyWebhookSignature(body, signature);
  if (!isValid) {
    logger.warn('Invalid Razorpay webhook signature', {
      meta: { signature, timestamp: new Date().toISOString() }
    });
    return res.status(403).json({ success: false, error: 'Invalid signature' });
  }

  const { event, payload } = req.body;
  const correlationId = req.correlationId;

  try {
    // Process webhook in transaction
    await executeInTransaction(
      async (session) => {
        const result = await webhookService.processWebhookEvent(
          event,
          payload,
          correlationId,
          session
        );

        // Publish to RabbitMQ for async processing
        await publishWebhookEvent(event, payload, { correlationId, processed: true });

        // Log webhook processing
        await createWebhookLog(event, payload, correlationId, 'success', session);

        return result;
      },
      { transactionName: `webhook_${event}_${correlationId}` }
    );

    logger.info('Webhook processed successfully', {
      meta: { event, correlationId, timestamp: new Date().toISOString() }
    });

    return res.status(200).json({ success: true, correlationId });
  } catch (error) {
    logger.error('Webhook processing failed', {
      meta: { event, correlationId, error: error.message }
    });

    // Still log the failure
    await createWebhookLog(event, payload, correlationId, 'failed', null, error.message);

    return res.status(200).json({ success: false, correlationId, error: error.message });
  }
});

// In webhookService.js
export const processWebhookEvent = asyncHandler(
  async (eventType, payload, correlationId, session) => {
    logger.info(`Processing webhook event: ${eventType}`, { meta: { correlationId } });

    switch (eventType) {
      case 'payment.authorized':
        return await handlePaymentAuthorized(payload, correlationId, session);

      case 'payment.captured':
        return await handlePaymentCaptured(payload, correlationId, session);

      case 'payment.failed':
        return await handlePaymentFailed(payload, correlationId, session);

      case 'subscription.completed':
        return await handleSubscriptionCompleted(payload, correlationId, session);

      case 'subscription.halted':
        return await handleSubscriptionHalted(payload, correlationId, session);

      default:
        logger.warn(`Unknown webhook event type: ${eventType}`, { meta: { correlationId } });
        return { processed: false, reason: 'Unknown event type' };
    }
  }
);

const handlePaymentCaptured = asyncHandler(async (payload, correlationId, session) => {
  const { order_id, payment_id } = payload.payment;

  const payment = await paymentRepository.findPaymentByRazorpayOrderId(order_id, session);
  if (!payment) {
    throw new Error(`Payment not found for order: ${order_id}`);
  }

  // Update payment and subscription atomically
  const updatedPayment = await paymentRepository.updatePaymentStatus(
    payment._id,
    EPaymentStatus.COMPLETED,
    { razorpayPaymentId: payment_id, completedAt: new Date() },
    session
  );

  if (payment.subscriptionId) {
    await subscriptionRepository.updateSubscriptionStatus(
      payment.subscriptionId,
      'active',
      { nextBillingDate: calculateNextBillingDate(payment.subscription) },
      null,
      { ipAddress: 'webhook', userAgent: 'razorpay-webhook' },
      session
    );
  }

  // Audit entry
  await paymentRepository.addPaymentAuditEntry(
    payment._id,
    'Payment captured via webhook',
    'payment_captured_webhook',
    null,
    { razorpayPaymentId: payment_id },
    'webhook',
    'razorpay-webhook',
    'success',
    null,
    session
  );

  return { payment: updatedPayment, status: 'captured' };
});
```

---

### Step 7: Enhance Audit Trail with Transaction Linking

**File:** `src/features/audit/auditService.js`

**Objective:** Ensure all payment/subscription changes are logged with correlation ID and transaction context.

**Details:**
- Update audit entry creation to include:
  - Transaction ID (if in transaction context)
  - Operation sequence number for ordering
  - Session ID for correlation
- Create `getAuditTrailByCorrelationId(correlationId)` query method:
  - Returns all audit entries linked to a correlation ID
  - Orders by timestamp ascending
  - Shows complete operation sequence
- Implement audit log retention policy (configurable, default 2 years)
- Add PII masking for sensitive fields in audit logs:
  - Card numbers (show last 4 digits only)
  - Email addresses (mask domain)
  - Phone numbers (show last 4 digits only)

**Key Methods:**
```javascript
export const getAuditTrailByCorrelationId = asyncHandler(
  async (correlationId, filters = {}) => {
    const query = { correlationId };

    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.operationType) query.operationType = filters.operationType;
    if (filters.userId) query.userId = filters.userId;
    if (filters.dateRange) {
      query.timestamp = {
        $gte: filters.dateRange.start,
        $lte: filters.dateRange.end
      };
    }

    const auditTrail = await Audit.find(query)
      .sort({ timestamp: 1 })
      .lean();

    return {
      correlationId,
      totalEntries: auditTrail.length,
      entries: auditTrail.map((entry) => maskSensitiveData(entry))
    };
  }
);

const maskSensitiveData = (entry) => {
  const masked = { ...entry };

  if (masked.changes?.after?.cardNumber) {
    masked.changes.after.cardNumber = `****${masked.changes.after.cardNumber.slice(-4)}`;
  }

  if (masked.changes?.after?.email) {
    const [local, domain] = masked.changes.after.email.split('@');
    masked.changes.after.email = `${local[0]}***@${domain}`;
  }

  if (masked.metadata?.cardNumber) {
    masked.metadata.cardNumber = `****${masked.metadata.cardNumber.slice(-4)}`;
  }

  return masked;
};
```

---

## Further Considerations

### 1. Transaction Timeout Strategy

**Decision:** Implement configurable timeouts per operation type.

**Implementation:**
- Create `TRANSACTION_TIMEOUTS` constant in `paymentConstants.js`:
  ```javascript
  {
    DEFAULT: 30000,        // 30 seconds
    PAYMENT_CREATION: 30000,
    PAYMENT_VERIFICATION: 30000,
    SUBSCRIPTION_RENEWAL: 45000,  // Longer due to multiple updates
    REFUND: 45000,
    WEBHOOK: 60000         // Longest due to potential cascading updates
  }
  ```
- Pass timeout to `executeInTransaction()` options
- Log transaction timeout as critical error for monitoring
- Implement circuit breaker pattern if transaction timeouts exceed 10% of requests

### 2. Nested Transaction Support

**Decision:** Enforce single-level transactions; prevent nested transaction calls.

**Implementation:**
- Modify `executeInTransaction()` to detect nested calls via AsyncLocalStorage
- Throw error if nested transaction attempted: `"Nested transactions not supported, use passed session parameter"`
- Document pattern: parent service passes session to child services
- Provide utility `getActiveSession()` to retrieve current session

### 3. Compensating Transactions

**Decision:** Implement Phase 2 (post-MVP) for complex scenarios.

**Initial Implementation (Phase 1):**
- Log all transaction failures with full context
- Manual intervention via operations dashboard
- Webhook retry mechanism handles most failures

**Phase 2:**
- Implement compensating transaction for refund failures:
  - If refund transaction fails, revert subscription back to active
  - Create audit entry documenting compensation
- Implement outbox pattern for guaranteed event publishing

### 4. Multi-Entity Update Order

**Decision:** Standardize order across all transactions to prevent deadlocks.

**Consistency:**
1. **Payment** (primary entity being modified)
2. **Subscription** (dependent entity)
3. **User/Customer** (if balance updates)
4. **Audit Log** (always last)

**Rationale:** Update most-accessed entities first, reduces lock wait time. Audit logs are always last since they don't affect business logic.

---

## Database Migration Requirements

**MongoDB Replica Set Check:**
- Verify MongoDB is running as replica set (required for transactions)
- In docker-compose.yml, confirm `MONGO_REPLICA_SET` is configured
- If running standalone, transactions will fail at runtime

**Index Creation:**
- Ensure indexes exist on:
  - `Payment.correlationId` (for idempotency lookup)
  - `Payment.razorpayOrderId` (for webhook lookup)
  - `Subscription.nextBillingDate` (for renewal queries)
  - Composite: `Payment.customerId + status`
  - Composite: `Subscription.customerId + status`

**Schema Validation:**
- Add `idempotencyKey` field to Payment schema if not present
- Add `transactionId` field to Audit schema for transaction linking
- Add webhook log collection schema

---

## Testing Strategy

**Unit Tests:**
- Test transaction commit/abort scenarios
- Test idempotent operations with duplicate requests
- Test timeout handling

**Integration Tests:**
- Test complete payment flow with transactions
- Test subscription renewal with multiple entity updates
- Test webhook processing with concurrent events
- Test transaction rollback on errors

**Load Tests:**
- Test transaction throughput under 1000 req/sec
- Monitor transaction timeout rates
- Verify no deadlock scenarios

---

## Monitoring & Observability

**Key Metrics:**
- Transaction success/failure rate
- Transaction execution time (p50, p95, p99)
- Transaction timeout rate
- Idempotent request detection rate
- Webhook processing latency

**Logging:**
- All transaction boundaries logged with correlationId
- Transaction abort reasons logged at ERROR level
- Transaction commit logged at DEBUG level

**Alerting:**
- Alert if transaction failure rate > 5%
- Alert if transaction timeout rate > 2%
- Alert if webhook processing latency > 10s
