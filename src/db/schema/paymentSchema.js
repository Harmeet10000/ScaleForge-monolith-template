import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  jsonb,
  decimal,
  boolean,
  index
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const payments = pgTable(
  'payments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    // Payment identifiers
    razorpayPaymentId: varchar('razorpay_payment_id', { length: 100 }).unique(),
    razorpayOrderId: varchar('razorpay_order_id', { length: 100 }),
    razorpaySignature: text('razorpay_signature'),

    // User and organization
    userId: uuid('user_id').notNull(),
    organizationId: uuid('organization_id'),

    // Payment details
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 3 }).default('INR'),
    status: varchar('status', { length: 20 }).notNull(), // pending, completed, failed, refunded, cancelled

    // Payment method
    method: varchar('method', { length: 50 }), // card, netbanking, wallet, upi
    methodDetails: jsonb('method_details').default({}),

    // Transaction details
    description: text('description'),
    notes: jsonb('notes').default({}),
    receipt: varchar('receipt', { length: 100 }),

    // Billing information
    billingAddress: jsonb('billing_address'),
    customerDetails: jsonb('customer_details'),

    // Payment gateway response
    gatewayResponse: jsonb('gateway_response'),
    gatewayFee: decimal('gateway_fee', { precision: 10, scale: 2 }),

    // Refund information
    refundAmount: decimal('refund_amount', { precision: 10, scale: 2 }).default('0.00'),
    refundStatus: varchar('refund_status', { length: 20 }),
    refundId: varchar('refund_id', { length: 100 }),
    refundReason: text('refund_reason'),

    // Subscription related (if applicable)
    subscriptionId: uuid('subscription_id'),
    planId: uuid('plan_id'),

    // Fraud detection
    riskScore: decimal('risk_score', { precision: 3, scale: 2 }),
    fraudFlags: jsonb('fraud_flags').default([]),

    // Metadata
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),

    // Status flags
    isRecurring: boolean('is_recurring').default(false),
    isRefunded: boolean('is_refunded').default(false),
    isDisputed: boolean('is_disputed').default(false),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    paidAt: timestamp('paid_at'),
    failedAt: timestamp('failed_at'),
    refundedAt: timestamp('refunded_at')
  },
  (table) => ({
    userIdIdx: index('payments_user_id_idx').on(table.userId),
    organizationIdx: index('payments_organization_idx').on(table.organizationId),
    statusIdx: index('payments_status_idx').on(table.status),
    razorpayPaymentIdx: index('payments_razorpay_payment_idx').on(table.razorpayPaymentId),
    razorpayOrderIdx: index('payments_razorpay_order_idx').on(table.razorpayOrderId),
    subscriptionIdx: index('payments_subscription_idx').on(table.subscriptionId),
    createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
    amountIdx: index('payments_amount_idx').on(table.amount),
    // Composite indexes
    userStatusIdx: index('payments_user_status_idx').on(table.userId, table.status),
    orgStatusIdx: index('payments_org_status_idx').on(table.organizationId, table.status)
  })
);
