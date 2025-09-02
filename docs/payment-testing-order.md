# Payment API Testing Order Guide

This guide provides the recommended order for testing Payment API endpoints to ensure proper flow and data dependencies.

## 🔧 Setup Requirements

### Environment Variables

Before starting, set these variables in your Postman environment:

```json
{
  "baseUrl": "http://localhost:3000/api/v1",
  "authToken": "YOUR_JWT_TOKEN_HERE",
  "correlationId": "test-correlation-{{$randomUUID}}",
  "paymentId": "",
  "razorpayOrderId": "",
  "razorpayPaymentId": ""
}
```

### Authentication

- Obtain a valid JWT token from the authentication endpoint
- Set the `authToken` variable in your Postman environment
- All endpoints (except verification) require Bearer token authentication

---

## 📋 Testing Order

### **Phase 1: Setup & Basic Operations**

#### **01. Get Razorpay API Key**

- **Purpose**: Verify API connectivity and get Razorpay public key
- **Dependencies**: None
- **Action**: Save the key for frontend integration
- **Expected**: 200 OK with Razorpay key

#### **02. Create Payment Order - Basic**

- **Purpose**: Test basic payment creation functionality
- **Dependencies**: Valid auth token
- **Action**: Save `paymentId` and `razorpayOrderId` from response
- **Expected**: 200 OK with payment and order details

---

### **Phase 2: Advanced Payment Creation**

#### **03. Create Payment Order - With Subscription**

- **Purpose**: Test payment creation with subscription metadata
- **Dependencies**: Valid auth token
- **Action**: Note the enhanced metadata in response
- **Expected**: 200 OK with subscription details

#### **04. Create Payment Order - International**

- **Purpose**: Test multi-currency payment support
- **Dependencies**: Valid auth token
- **Action**: Verify USD currency handling
- **Expected**: 200 OK with USD currency

#### **05. Test Idempotency - Duplicate Request**

- **Purpose**: Verify idempotency mechanism works
- **Dependencies**: Same correlation ID as request #02
- **Action**: Use exact same payload as request #02
- **Expected**: 200 OK with `idempotent: true` flag

---

### **Phase 3: Payment Verification**

#### **06. Verify Payment**

- **Purpose**: Test payment signature verification
- **Dependencies**: `razorpayOrderId` from previous requests
- **Action**: Use test signature (in production, this comes from Razorpay)
- **Expected**: 200 OK or redirect to success page
- **Note**: Update `razorpayOrderId` variable before running

---

### **Phase 4: Payment Information Retrieval**

#### **07. Get Payment Status**

- **Purpose**: Test individual payment status retrieval
- **Dependencies**: `paymentId` from payment creation
- **Action**: Verify payment details and status
- **Expected**: 200 OK with complete payment information
- **Note**: Update `paymentId` variable before running

#### **08. Get Payment History - Basic**

- **Purpose**: Test payment history with basic pagination
- **Dependencies**: Valid auth token, existing payments
- **Action**: Review pagination structure
- **Expected**: 200 OK with payments array and pagination info

#### **09. Get Payment History - Advanced Filter**

- **Purpose**: Test advanced filtering and sorting
- **Dependencies**: Valid auth token, payments with different statuses
- **Action**: Verify filtering by status, date range, and sorting
- **Expected**: 200 OK with filtered results

#### **10. Get Payment History - Subscription Filter**

- **Purpose**: Test subscription-specific filtering
- **Dependencies**: Valid auth token, payments with subscription IDs
- **Action**: Verify subscription-based filtering works
- **Expected**: 200 OK with subscription-filtered results

---

### **Phase 5: Refund Operations**

#### **11. Process Refund - Full**

- **Purpose**: Test full refund functionality
- **Dependencies**: Completed payment with `paymentId`
- **Action**: Process complete refund
- **Expected**: 200 OK with refund details
- **Note**: Payment must be in "completed" status

#### **12. Process Refund - Partial**

- **Purpose**: Test partial refund functionality
- **Dependencies**: Completed payment with sufficient amount
- **Action**: Refund partial amount with detailed notes
- **Expected**: 200 OK with partial refund confirmation

#### **13. Process Refund - With Details**

- **Purpose**: Test refund with comprehensive metadata
- **Dependencies**: Completed payment
- **Action**: Include support ticket and categorization
- **Expected**: 200 OK with detailed refund information

---

### **Phase 6: Error Handling & Recovery**

#### **14. Retry Failed Payment**

- **Purpose**: Test payment retry mechanism
- **Dependencies**: Failed payment with `paymentId`
- **Action**: Attempt to retry failed payment
- **Expected**: 200 OK with retry information
- **Note**: Payment must be in "failed" status and within retry limits

---

## 🔄 Complete Testing Workflows

### **Workflow 1: Happy Path**

```
01 → 02 → 06 → 07 → 08
```

1. Get API key
2. Create payment
3. Verify payment
4. Check status
5. View history

### **Workflow 2: Refund Flow**

```
01 → 02 → 06 → 07 → 11 → 07
```

1. Get API key
2. Create payment
3. Verify payment
4. Check status (completed)
5. Process refund
6. Check updated status (refunded)

### **Workflow 3: Idempotency Testing**

```
01 → 02 → 05
```

1. Get API key
2. Create payment
3. Duplicate same request (should return existing payment)

### **Workflow 4: Advanced Features**

```
01 → 03 → 04 → 09 → 10 → 12
```

1. Get API key
2. Create subscription payment
3. Create international payment
4. Filter by advanced criteria
5. Filter by subscription
6. Process partial refund

---

## ⚠️ Important Notes

### **Variable Management**

- **Always update variables**: Copy `paymentId` and `razorpayOrderId` from responses
- **Use consistent correlation IDs**: For idempotency testing
- **Update auth tokens**: Refresh JWT tokens when they expire

### **Test Data Requirements**

- **Valid JWT token**: Must be authenticated user
- **Razorpay test credentials**: Use test environment keys
- **Payment status**: Some operations require specific payment statuses

### **Error Scenarios to Test**

- **Invalid payment ID**: Use non-existent payment ID
- **Unauthorized access**: Use invalid or expired token
- **Invalid refund**: Try to refund non-completed payment
- **Exceeded retry limit**: Try to retry payment beyond limit

### **Expected Response Codes**

- **200**: Successful operations
- **400**: Business logic errors (invalid refund, retry limit exceeded)
- **401**: Authentication errors
- **403**: Authorization errors (accessing other user's payment)
- **404**: Payment not found
- **422**: Validation errors

---

## 🚀 Quick Start Checklist

- [ ] Import the Postman collection
- [ ] Set up environment variables
- [ ] Obtain valid JWT authentication token
- [ ] Update `authToken` in environment
- [ ] Start with request #01 (Get Razorpay API Key)
- [ ] Follow the numbered sequence
- [ ] Update variables between requests as needed
- [ ] Test error scenarios after happy path

This testing order ensures proper data flow and validates all SaaS payment features including correlation IDs, idempotency, enhanced error handling, and comprehensive payment management capabilities.
