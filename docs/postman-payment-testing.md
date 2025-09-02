# Payment API Testing Guide - Postman

This guide provides comprehensive JSON data and testing scenarios for all payment API endpoints using Postman.

## Prerequisite

s
cation**: All endpoints (except verification) require Bearer token authentication 2. **Base URL**: `http://localhost:3000/api/v1/payments` 3. **Headers\*\*:

```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
X-Correlation-ID: test-correlation-123 (optional)
```

## API Endpoints Testing

### 1. Create Payment Order (Checkout)

**Endpoint**: `POST /payments/checkout`

**Headers**:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body - Basic Payment**:

```json
{
  "amount": 100.5,
  "currency": "INR",
  "description": "Premium subscription payment"
}
```

**Request Body - Payment with Subscription**:

```json
{
  "amount": 299.99,
  "currency": "INR",
  "subscriptionId": "sub_premium_monthly",
  "description": "Monthly premium subscription",
  "metadata": {
    "plan": "premium",
    "billing_cycle": "monthly",
    "user_tier": "pro"
  },
  "notes": {
    "customer_note": "Upgrade to premium",
    "promo_code": "SAVE20"
  }
}
```

**Request Body - International Payment**:

```json
{
  "amount": 29.99,
  "currency": "USD",
  "description": "International premium subscription",
  "metadata": {
    "region": "US",
    "plan": "premium_international"
  }
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "paymentId": "pay_abc123def456",
    "razorpayOrderId": "order_xyz789",
    "amount": 100.5,
    "currency": "INR"
  },
  "request": {
    "correlationId": "generated-correlation-id"
  }
}
```

---

### 2. Verify Payment

**Endpoint**: `POST /payments/verification`

**Headers**:

```json
{
  "Content-Type": "application/json"
}
```

**Request Body**:

```json
{
  "razorpay_order_id": "order_xyz789",
  "razorpay_payment_id": "pay_razorpay123",
  "razorpay_signature": "generated_signature_hash"
}
```

**Expected Response (JSON)**:

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "pay_abc123def456",
    "status": "completed",
    "razorpayPaymentId": "pay_razorpay123"
  }
}
```

---

### 3. Get Payment History

**Endpoint**: `GET /payments/history`

**Headers**:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Query Parameters - Basic**:

```
?page=1&limit=10
```

**Query Parameters - Advanced Filtering**:

```
?page=1&limit=20&status=completed&startDate=2024-01-01&endDate=2024-12-31&sortBy=createdAt&sortOrder=desc
```

**Query Parameters - Subscription Filtering**:

```
?subscriptionId=sub_premium_monthly&status=completed&limit=5
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment history retrieved successfully",
  "data": {
    "payments": [
      {
        "paymentId": "pay_abc123def456",
        "amount": 100.5,
        "currency": "INR",
        "status": "completed",
        "description": "Premium subscription payment",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:35:00.000Z",
        "razorpayPaymentId": "pay_razorpay123",
        "subscriptionId": "sub_premium_monthly"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalRecords": 47,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

---

### 4. Get Payment Status

**Endpoint**: `GET /payments/status/{paymentId}`

**Headers**:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Example**: `/payments/status/pay_abc123def456`

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment status retrieved successfully",
  "data": {
    "paymentId": "pay_abc123def456",
    "status": "completed",
    "amount": 100.5,
    "currency": "INR",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z",
    "razorpayPaymentId": "pay_razorpay123",
    "description": "Premium subscription payment"
  }
}
```

---

### 5. Process Refund

**Endpoint**: `POST /payments/refund`

**Headers**:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Request Body - Full Refund**:

```json
{
  "paymentId": "pay_abc123def456",
  "reason": "Customer requested cancellation"
}
```

**Request Body - Partial Refund**:

```json
{
  "paymentId": "pay_abc123def456",
  "amount": 50.25,
  "reason": "Partial service cancellation",
  "notes": {
    "refund_type": "partial",
    "service_used": "50%"
  }
}
```

**Request Body - Refund with Details**:

```json
{
  "paymentId": "pay_abc123def456",
  "amount": 100.5,
  "reason": "Service not delivered",
  "notes": {
    "refund_type": "full",
    "issue_category": "service_failure",
    "support_ticket": "TKT-12345"
  }
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Refund processed successfully",
  "data": {
    "refundId": "rfnd_xyz789abc",
    "paymentId": "pay_abc123def456",
    "amount": 100.5,
    "status": "refunded"
  }
}
```

---

### 6. Retry Failed Payment

**Endpoint**: `POST /payments/retry/{paymentId}`

**Headers**:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**URL Example**: `/payments/retry/pay_failed123`

**Expected Response**:

```json
{
  "success": true,
  "message": "Payment retry initiated successfully",
  "data": {
    "paymentId": "pay_failed123",
    "status": "processing",
    "retryCount": 2,
    "nextRetryAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 7. Get Razorpay API Key

**Endpoint**: `GET /payments/key`

**Headers**:

```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN"
}
```

**Expected Response**:

```json
{
  "success": true,
  "message": "Razorpay API key retrieved",
  "data": {
    "key": "rzp_test_1234567890abcdef"
  }
}
```

---

## Error Response Examples

### Validation Error (422)

```json
{
  "success": false,
  "message": "Validation error: \"amount\" is required",
  "error": {
    "statusCode": 422,
    "details": "Invalid request data"
  }
}
```

### Unauthorized Error (401)

```json
{
  "success": false,
  "message": "Unauthorized access",
  "error": {
    "statusCode": 401,
    "details": "Invalid or missing authentication token"
  }
}
```

### Payment Not Found (404)

```json
{
  "success": false,
  "message": "Payment not found",
  "error": {
    "statusCode": 404,
    "details": "The requested payment does not exist"
  }
}
```

### Forbidden Access (403)

```json
{
  "success": false,
  "message": "Unauthorized access to payment",
  "error": {
    "statusCode": 403,
    "details": "You don't have permission to access this payment"
  }
}
```

### Business Logic Error (400)

```json
{
  "success": false,
  "message": "Only completed payments can be refunded",
  "error": {
    "statusCode": 400,
    "details": "Payment status does not allow refund operation"
  }
}
```

---

## Testing Scenarios

### Scenario 1: Complete Payment Flow

1. **Create Payment**: POST `/payments/checkout`
2. **Verify Payment**: POST `/payments/verification`
3. **Check Status**: GET `/payments/status/{paymentId}`
4. **View History**: GET `/payments/history`

### Scenario 2: Refund Flow

1. **Create Payment**: POST `/payments/checkout`
2. **Verify Payment**: POST `/payments/verification`
3. **Process Refund**: POST `/payments/refund`
4. **Check Updated Status**: GET `/payments/status/{paymentId}`

### Scenario 3: Failed Payment Retry

1. **Create Payment**: POST `/payments/checkout`
2. **Simulate Failure**: (Payment fails at gateway)
3. **Retry Payment**: POST `/payments/retry/{paymentId}`
4. **Check Retry Status**: GET `/payments/status/{paymentId}`

### Scenario 4: Idempotency Testing

1. **Create Payment**: POST `/payments/checkout` (with same data)
2. **Repeat Request**: POST `/payments/checkout` (exact same payload)
3. **Verify Idempotent Response**: Should return existing payment

---

## Postman Collection Variables

Set these variables in your Postman environment:

```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "YOUR_JWT_TOKEN_HERE",
  "correlationId": "test-correlation-{{$randomUUID}}",
  "testPaymentId": "pay_test123",
  "testAmount": "100.50",
  "testCurrency": "INR"
}
```

## Pre-request Scripts

Add this to your Postman collection pre-request script for automatic correlation ID generation:

```javascript
// Generate correlation ID if not present
if (!pm.environment.get('correlationId')) {
  pm.environment.set('correlationId', 'test-' + pm.variables.replaceIn('{{$randomUUID}}'));
}

// Set correlation ID header
pm.request.headers.add({
  key: 'X-Correlation-ID',
  value: pm.environment.get('correlationId')
});
```

## Test Scripts

Add this to your Postman collection test script for automatic validation:

```javascript
// Test for successful response
pm.test('Status code is 200', function () {
  pm.response.to.have.status(200);
});

pm.test('Response has success field', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('success');
  pm.expect(jsonData.success).to.be.true;
});

pm.test('Response has data field', function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData).to.have.property('data');
});

// Save payment ID for subsequent requests
if (pm.response.json().data && pm.response.json().data.paymentId) {
  pm.environment.set('lastPaymentId', pm.response.json().data.paymentId);
}
```

This comprehensive guide should help you test all payment API endpoints thoroughly in Postman!

1.
