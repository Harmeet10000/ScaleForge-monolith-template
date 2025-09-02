# Billing and Invoice Management System

## Overview

The billing and invoice management system provides comprehensive functionality for handling subscription billing, invoice generation, payment method management, and recurring billing processes. This system is designed to handle complex billing scenarios including prorated billing, credit management, and automated recurring billing.

## Key Features

### 1. Invoice Generation

- **Automatic Invoice Generation**: Generate invoices for subscriptions with customizable due dates and payment terms
- **Proration Support**: Calculate and generate proration invoices for mid-cycle plan changes
- **Tax Calculation**: Automatic tax calculation based on billing profile tax information
- **Credit Application**: Automatically apply available credit balance to reduce invoice amounts
- **Idempotency**: Prevent duplicate invoice generation with correlation ID tracking

### 2. Billing Profile Management

- **Customer Billing Profiles**: Store billing address, tax information, and preferences
- **Payment Method Storage**: Support for multiple payment methods (cards, bank accounts, UPI, wallets)
- **Credit Balance Management**: Track and manage customer credit balances
- **Audit Trail**: Complete audit trail for all billing profile changes

### 3. Recurring Billing

- **Automated Processing**: Scheduled recurring billing for active subscriptions
- **Batch Processing**: Process multiple subscriptions efficiently
- **Failure Handling**: Automatic retry logic with exponential backoff
- **Dry Run Mode**: Test billing processes without actual execution

### 4. Payment Failure Management

- **Retry Logic**: Automatic retry for failed payments with configurable attempts
- **Subscription Management**: Suspend subscriptions after max retry failures
- **Notification Integration**: Send notifications for payment failures and retries

## API Endpoints

### Invoice Management

#### Generate Invoice

```http
POST /api/v1/billing/invoices/generate/{subscriptionId}
```

**Request Body:**

```json
{
  "dueDays": 30,
  "paymentTerms": "Net 30",
  "notes": "Monthly subscription invoice"
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Invoice generated successfully",
  "data": {
    "invoice": {
      "paymentId": "pay_123",
      "correlationId": "corr_123",
      "customerId": "cust_123",
      "subscriptionId": "sub_123",
      "amount": 900,
      "currency": "INR",
      "status": "pending",
      "metadata": {
        "invoiceData": {
          "invoiceNumber": "INV-ABC123",
          "issueDate": "2024-01-01T00:00:00.000Z",
          "dueDate": "2024-01-31T00:00:00.000Z",
          "subtotal": 1000,
          "taxAmount": 180,
          "creditApplied": 100,
          "total": 1180,
          "amountDue": 900
        }
      }
    }
  }
}
```

#### Generate Proration Invoice

```http
POST /api/v1/billing/invoices/proration/{subscriptionId}
```

**Request Body:**

```json
{
  "planName": "Premium Plan",
  "amount": 2000
}
```

### Billing Profile Management

#### Create Billing Profile

```http
POST /api/v1/billing/profiles/{customerId}
```

**Request Body:**

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

#### Add Payment Method

```http
POST /api/v1/billing/profiles/{customerId}/payment-methods
```

**Card Payment Method:**

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

**Bank Account Payment Method:**

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

**UPI Payment Method:**

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

### Recurring Billing

#### Process Recurring Billing

```http
POST /api/v1/billing/billing/recurring
```

**Request Body:**

```json
{
  "bufferHours": 24,
  "dryRun": false
}
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Recurring billing processed successfully",
  "data": {
    "results": {
      "total": 150,
      "processed": 145,
      "failed": 3,
      "skipped": 2,
      "details": [
        {
          "subscriptionId": "sub_123",
          "customerId": "cust_123",
          "status": "billed",
          "invoiceId": "pay_456",
          "amount": 1000
        }
      ]
    }
  }
}
```

## Data Models

### Invoice Model

```javascript
{
  invoiceNumber: String,        // Unique invoice number
  correlationId: String,        // Request correlation ID
  customerId: ObjectId,         // Customer reference
  subscriptionId: ObjectId,     // Subscription reference
  paymentId: ObjectId,          // Payment reference
  type: String,                 // invoice, credit_note, proration_invoice
  status: String,               // draft, pending, paid, overdue, cancelled
  issueDate: Date,              // Invoice issue date
  dueDate: Date,                // Payment due date
  currency: String,             // Currency code
  subtotal: Number,             // Amount before tax
  taxAmount: Number,            // Tax amount
  creditApplied: Number,        // Credit applied
  total: Number,                // Total amount
  amountDue: Number,            // Amount due after credits
  lineItems: Array,             // Invoice line items
  billingAddress: Object,       // Billing address
  taxInformation: Object,       // Tax details
  paymentHistory: Array,        // Payment history
  auditTrail: Array            // Audit trail
}
```

### Billing Profile Model

```javascript
{
  customerId: ObjectId,         // Customer reference
  paymentMethods: Array,        // Payment methods
  billingAddress: Object,       // Billing address
  taxInformation: Object,       // Tax information
  preferences: Object,          // Billing preferences
  creditBalance: Number,        // Available credit
  totalSpent: Number,           // Total amount spent
  lastPaymentDate: Date,        // Last payment date
  auditTrail: Array            // Audit trail
}
```

## Business Logic

### Proration Calculation

The system calculates proration amounts when subscription plans change mid-cycle:

1. **Calculate Daily Rates**: Divide monthly amounts by days in billing period
2. **Determine Remaining Days**: Calculate days remaining in current period
3. **Calculate Difference**: Compute difference between old and new daily rates
4. **Apply to Remaining Period**: Multiply rate difference by remaining days

### Credit Management

- **Automatic Application**: Credits are automatically applied to new invoices
- **Balance Tracking**: System maintains running credit balance
- **Audit Trail**: All credit transactions are logged

### Tax Calculation

- **Configurable Rates**: Tax rates configured per billing profile
- **Exemption Support**: Handle tax-exempt customers
- **Multiple Tax Types**: Support for GST, VAT, sales tax, etc.

## Recurring Billing Service

### Automated Processing

The recurring billing service runs daily at 2:00 AM IST and processes:

1. **Subscription Renewals**: Renew subscriptions due for renewal
2. **Invoice Generation**: Generate invoices for renewed subscriptions
3. **Payment Processing**: Process payments for generated invoices
4. **Failure Handling**: Handle payment failures and retries

### Configuration

```javascript
{
  bufferHours: 24,        // Hours before due date to process
  batchSize: 50,          // Number of subscriptions per batch
  retryAttempts: 3,       // Max retry attempts for failures
  retryDelay: 5000        // Delay between retries (ms)
}
```

## Error Handling

### Payment Failures

1. **First Failure**: Schedule retry with 1-hour delay
2. **Second Failure**: Schedule retry with 4-hour delay
3. **Third Failure**: Schedule retry with 16-hour delay
4. **Max Retries Exceeded**: Suspend subscription

### Validation Errors

- **Required Fields**: Validate all required fields
- **Data Types**: Ensure correct data types
- **Business Rules**: Validate business logic constraints
- **Format Validation**: Validate formats (IFSC, UPI ID, etc.)

## Security Considerations

### Data Protection

- **PCI Compliance**: Secure handling of payment method data
- **Encryption**: Encrypt sensitive data at rest and in transit
- **Access Control**: Role-based access to billing data
- **Audit Logging**: Complete audit trail for compliance

### API Security

- **Authentication**: JWT-based authentication required
- **Rate Limiting**: Prevent abuse with rate limiting
- **Input Validation**: Comprehensive input validation
- **CORS**: Proper CORS configuration

## Monitoring and Observability

### Metrics

- **Invoice Generation Rate**: Track invoice generation success/failure
- **Payment Success Rate**: Monitor payment processing success
- **Retry Attempts**: Track payment retry patterns
- **Processing Time**: Monitor billing process performance

### Logging

- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Error Tracking**: Detailed error logging with stack traces
- **Audit Trail**: Complete audit trail for all operations
- **Performance Metrics**: Track API response times and throughput

## Integration Points

### Payment Gateway

- **Razorpay Integration**: Process payments through Razorpay
- **Webhook Handling**: Handle payment status webhooks
- **Refund Processing**: Process refunds for cancelled subscriptions

### Notification System

- **Invoice Notifications**: Send invoice generation notifications
- **Payment Reminders**: Send payment due reminders
- **Failure Alerts**: Alert on payment failures
- **Admin Notifications**: Notify admins of critical issues

### Subscription System

- **Subscription Lifecycle**: Integrate with subscription management
- **Plan Changes**: Handle plan upgrade/downgrade scenarios
- **Cancellation Processing**: Process subscription cancellations

## Best Practices

### Development

1. **Idempotency**: Always use correlation IDs for idempotent operations
2. **Error Handling**: Implement comprehensive error handling
3. **Validation**: Validate all inputs thoroughly
4. **Testing**: Write comprehensive tests for billing logic
5. **Documentation**: Maintain up-to-date API documentation

### Operations

1. **Monitoring**: Monitor all billing processes continuously
2. **Alerting**: Set up alerts for critical failures
3. **Backup**: Regular backups of billing data
4. **Disaster Recovery**: Plan for disaster recovery scenarios
5. **Compliance**: Ensure compliance with financial regulations

### Performance

1. **Batch Processing**: Process large volumes in batches
2. **Caching**: Cache frequently accessed data
3. **Database Optimization**: Optimize database queries
4. **Async Processing**: Use async processing for heavy operations
5. **Load Balancing**: Distribute load across multiple instances
