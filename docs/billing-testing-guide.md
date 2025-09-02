# Billing System Testing Guide

This guide provides a step-by-step testing workflow for the billing and invoice management system. Follow these steps in order to properly test all functionality.

## Prerequisites

1. **Authentication**: Obtain a valid JWT token
2. **Customer Setup**: Have a valid customer ID
3. **Subscription Setup**: Have an active subscription
4. **Environment**: Ensure all services are running (MongoDB, Redis, etc.)

## Testing Workflow

### Phase 1: Setup and Authentication

#### 1.1 Health Check

```http
GET /api/v1/health
```

Verify the system is running properly.

#### 1.2 Authentication

```http
POST /api/v1/auth/login
```

Get your JWT token for subsequent requests.

### Phase 2: Billing Profile Management

#### 2.1 Create Billing Profile

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}`

**Test Data:**

```json
{
  "billingAddress": {
    "street": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "IN"
  },
  "taxInformation": {
    "taxId": "22AAAAA0000A1Z5",
    "taxType": "GST",
    "exemptionStatus": false
  },
  "preferences": {
    "currency": "INR",
    "invoiceDelivery": "email",
    "autoRenewal": true,
    "reminderDays": 7,
    "language": "en"
  }
}
```

**Expected Result:** 201 Created with billing profile details

#### 2.2 Get Billing Profile

**Endpoint:** `GET /api/v1/billing/profiles/{customerId}`

**Expected Result:** 200 OK with billing profile details

#### 2.3 Update Billing Profile

**Endpoint:** `PUT /api/v1/billing/profiles/{customerId}`

**Test Data:**

```json
{
  "billingAddress": {
    "street": "456 Updated Street",
    "city": "Delhi",
    "state": "Delhi",
    "postalCode": "110001",
    "country": "IN"
  },
  "preferences": {
    "reminderDays": 14,
    "language": "hi"
  }
}
```

**Expected Result:** 200 OK with updated billing profile

### Phase 3: Payment Method Management

#### 3.1 Add Card Payment Method

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}/payment-methods`

**Test Data:**

```json
{
  "methodId": "card_1234567890",
  "type": "card",
  "details": {
    "last4": "4242",
    "brand": "visa",
    "expiryMonth": 12,
    "expiryYear": 2025,
    "holderName": "John Doe",
    "nickname": "Primary Card"
  },
  "isDefault": true
}
```

**Expected Result:** 200 OK with updated billing profile containing the new payment method

#### 3.2 Add Bank Account Payment Method

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}/payment-methods`

**Test Data:**

```json
{
  "methodId": "bank_1234567890",
  "type": "bank_account",
  "details": {
    "accountNumber": "12345678901234",
    "ifscCode": "HDFC0000123",
    "bankName": "HDFC Bank",
    "holderName": "John Doe",
    "nickname": "Salary Account"
  },
  "isDefault": false
}
```

**Expected Result:** 200 OK with updated billing profile

#### 3.3 Add UPI Payment Method

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}/payment-methods`

**Test Data:**

```json
{
  "methodId": "upi_1234567890",
  "type": "upi",
  "details": {
    "upiId": "john.doe@paytm",
    "holderName": "John Doe",
    "nickname": "Primary UPI"
  },
  "isDefault": false
}
```

**Expected Result:** 200 OK with updated billing profile

#### 3.4 Set Default Payment Method

**Endpoint:** `PUT /api/v1/billing/profiles/{customerId}/payment-methods/{methodId}/default`

Use the `methodId` from step 3.2 (bank account) to change the default payment method.

**Expected Result:** 200 OK with updated default payment method

#### 3.5 Remove Payment Method

**Endpoint:** `DELETE /api/v1/billing/profiles/{customerId}/payment-methods/{methodId}`

Use the `methodId` from step 3.3 (UPI) to remove a payment method.

**Expected Result:** 200 OK with payment method removed from billing profile

### Phase 4: Invoice Generation

#### 4.1 Generate Standard Invoice

**Endpoint:** `POST /api/v1/billing/invoices/generate/{subscriptionId}`

**Test Data:**

```json
{
  "dueDays": 30,
  "paymentTerms": "Net 30",
  "notes": "Monthly subscription invoice"
}
```

**Expected Result:** 201 Created with invoice details
**Note:** Save the `invoiceId` from the response for later tests

#### 4.2 Test Idempotency

**Endpoint:** `POST /api/v1/billing/invoices/generate/{subscriptionId}`

Use the same request data as step 4.1 with the same correlation ID.

**Expected Result:** 200 OK with `isIdempotent: true` and existing invoice details

#### 4.3 Generate Proration Invoice (Plan Upgrade)

**Endpoint:** `POST /api/v1/billing/invoices/proration/{subscriptionId}`

**Test Data:**

```json
{
  "planName": "Premium Plan",
  "amount": 2000
}
```

**Expected Result:** 201 Created with proration invoice (positive amount for upgrade)

#### 4.4 Generate Proration Invoice (Plan Downgrade)

**Endpoint:** `POST /api/v1/billing/invoices/proration/{subscriptionId}`

**Test Data:**

```json
{
  "planName": "Basic Plan",
  "amount": 500
}
```

**Expected Result:** 201 Created with credit note (negative amount for downgrade)

### Phase 5: Invoice Management

#### 5.1 Get Customer Invoices (All)

**Endpoint:** `GET /api/v1/billing/invoices/customer/{customerId}?limit=10&page=0`

**Expected Result:** 200 OK with list of all customer invoices

#### 5.2 Get Customer Invoices (Filtered by Status)

**Endpoint:** `GET /api/v1/billing/invoices/customer/{customerId}?status=pending&limit=10&page=0`

**Expected Result:** 200 OK with filtered invoice list

#### 5.3 Get Customer Invoices (Date Range)

**Endpoint:** `GET /api/v1/billing/invoices/customer/{customerId}?dateFrom=2024-01-01&dateTo=2024-12-31&limit=10&page=0`

**Expected Result:** 200 OK with date-filtered invoice list

#### 5.4 Send Invoice Reminder

**Endpoint:** `POST /api/v1/billing/invoices/{invoiceId}/reminder`

**Test Data:**

```json
{
  "reminderType": "standard"
}
```

**Expected Result:** 200 OK with reminder sent confirmation

### Phase 6: Recurring Billing

#### 6.1 Dry Run Recurring Billing

**Endpoint:** `POST /api/v1/billing/billing/recurring`

**Test Data:**

```json
{
  "bufferHours": 24,
  "dryRun": true
}
```

**Expected Result:** 200 OK with dry run results showing what would be processed

#### 6.2 Process Recurring Billing

**Endpoint:** `POST /api/v1/billing/billing/recurring`

**Test Data:**

```json
{
  "bufferHours": 24,
  "dryRun": false
}
```

**Expected Result:** 200 OK with actual processing results

### Phase 7: Payment Failure Handling

#### 7.1 Handle Payment Failure (First Attempt)

**Endpoint:** `POST /api/v1/billing/payments/{subscriptionId}/{paymentId}/failure`

**Test Data:**

```json
{
  "reason": "Insufficient funds",
  "retryable": true
}
```

**Expected Result:** 200 OK with retry scheduled

#### 7.2 Handle Payment Failure (Max Retries)

**Endpoint:** `POST /api/v1/billing/payments/{subscriptionId}/{paymentId}/failure`

Simulate multiple failures by calling this endpoint multiple times with different payment IDs.

**Expected Result:** 200 OK with subscription suspended after max retries

### Phase 8: Reporting and Statistics

#### 8.1 Get Billing Statistics (Global)

**Endpoint:** `GET /api/v1/billing/statistics`

**Expected Result:** 200 OK with overall billing statistics

#### 8.2 Get Billing Statistics (Customer-Specific)

**Endpoint:** `GET /api/v1/billing/statistics?customerId={customerId}`

**Expected Result:** 200 OK with customer-specific statistics

#### 8.3 Get Billing Statistics (Date Range)

**Endpoint:** `GET /api/v1/billing/statistics?dateFrom=2024-01-01&dateTo=2024-12-31`

**Expected Result:** 200 OK with date-filtered statistics

#### 8.4 Get Overdue Invoices

**Endpoint:** `GET /api/v1/billing/invoices/overdue?limit=50`

**Expected Result:** 200 OK with list of overdue invoices

## Error Testing Scenarios

### 9.1 Validation Errors

#### 9.1.1 Invalid Billing Address

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}`

**Test Data:**

```json
{
  "billingAddress": {
    "street": "123",
    "city": "A",
    "state": "",
    "postalCode": "12",
    "country": "INVALID"
  }
}
```

**Expected Result:** 400 Bad Request with validation errors

#### 9.1.2 Invalid Payment Method

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}/payment-methods`

**Test Data:**

```json
{
  "methodId": "invalid_method",
  "type": "invalid_type",
  "details": {}
}
```

**Expected Result:** 400 Bad Request with validation errors

#### 9.1.3 Invalid Card Details

**Endpoint:** `POST /api/v1/billing/profiles/{customerId}/payment-methods`

**Test Data:**

```json
{
  "methodId": "card_invalid",
  "type": "card",
  "details": {
    "last4": "123",
    "brand": "invalid_brand",
    "expiryMonth": 13,
    "expiryYear": 2020
  }
}
```

**Expected Result:** 400 Bad Request with card validation errors

### 9.2 Not Found Errors

#### 9.2.1 Non-existent Customer

**Endpoint:** `GET /api/v1/billing/profiles/nonexistent_customer_id`

**Expected Result:** 404 Not Found

#### 9.2.2 Non-existent Subscription

**Endpoint:** `POST /api/v1/billing/invoices/generate/nonexistent_subscription_id`

**Expected Result:** 404 Not Found

#### 9.2.3 Non-existent Payment Method

**Endpoint:** `DELETE /api/v1/billing/profiles/{customerId}/payment-methods/nonexistent_method_id`

**Expected Result:** 404 Not Found

### 9.3 Business Logic Errors

#### 9.3.1 Duplicate Billing Profile

Try to create a billing profile for a customer that already has one.

**Expected Result:** 409 Conflict

#### 9.3.2 Remove Last Payment Method

Try to remove the only payment method from a billing profile.

**Expected Result:** 400 Bad Request (business rule violation)

## Test Data Management

### Environment Variables

```bash
# Set these in your test environment
CUSTOMER_ID=your_test_customer_id
SUBSCRIPTION_ID=your_test_subscription_id
PAYMENT_ID=your_test_payment_id
INVOICE_ID=generated_invoice_id
METHOD_ID=generated_method_id
```

### Postman Variables

Set these variables in your Postman environment:

- `baseUrl`: `http://localhost:8000/api/v1`
- `authToken`: Your JWT token
- `customerId`: Test customer ID
- `subscriptionId`: Test subscription ID
- `invoiceId`: Generated invoice ID
- `methodId`: Generated payment method ID

## Expected Response Structure

All successful responses follow this structure:

```json
{
  "success": true,
  "statusCode": 200,
  "request": {
    "ip": "127.0.0.1",
    "method": "POST",
    "url": "/api/v1/billing/...",
    "correlationId": "abc123"
  },
  "message": "Operation completed successfully",
  "data": {
    // Response data here
  }
}
```

## Performance Testing

### Load Testing Scenarios

1. **Concurrent Invoice Generation**: 100 concurrent requests
2. **Bulk Payment Method Addition**: 50 payment methods per customer
3. **Large Customer Base**: 1000+ customers with billing profiles
4. **Recurring Billing Load**: Process 10,000+ subscriptions

### Performance Expectations

- **Invoice Generation**: < 500ms per request
- **Billing Profile Operations**: < 200ms per request
- **Recurring Billing**: Process 1000 subscriptions in < 60 seconds
- **Database Queries**: < 100ms for simple operations

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure JWT token is valid and not expired
2. **Validation Errors**: Check request body format and required fields
3. **Database Errors**: Verify MongoDB connection and data integrity
4. **Service Errors**: Check logs for detailed error information

### Debug Tips

1. Use correlation IDs to trace requests through logs
2. Check audit trails for operation history
3. Verify subscription and customer data exists
4. Test with minimal data first, then add complexity

This testing guide ensures comprehensive coverage of all billing system functionality in the correct order for proper testing workflow.
