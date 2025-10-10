import { pgTable, text, timestamp, uuid, varchar, jsonb, index } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const auditEntries = pgTable(
  'audit_entries',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => createId()),

    // Entity information
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id').notNull(),

    // Operation details
    operation: varchar('operation', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // success, failure, error, pending

    // User and organization context
    userId: uuid('user_id'),
    organizationId: uuid('organization_id'),

    // Request context
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 100 }),

    // Change tracking
    previousData: jsonb('previous_data'),
    newData: jsonb('new_data'),
    changes: jsonb('changes'),

    // Additional metadata
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),

    // Error information (if applicable)
    errorMessage: text('error_message'),
    errorCode: varchar('error_code', { length: 50 }),
    stackTrace: text('stack_trace'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    timestamp: timestamp('timestamp').defaultNow()
  },
  (table) => ({
    entityTypeIdx: index('audit_entity_type_idx').on(table.entityType),
    entityIdIdx: index('audit_entity_id_idx').on(table.entityId),
    userIdIdx: index('audit_user_id_idx').on(table.userId),
    organizationIdx: index('audit_organization_idx').on(table.organizationId),
    statusIdx: index('audit_status_idx').on(table.status),
    operationIdx: index('audit_operation_idx').on(table.operation),
    timestampIdx: index('audit_timestamp_idx').on(table.timestamp),
    createdAtIdx: index('audit_created_at_idx').on(table.createdAt),
    // Composite indexes for common queries
    entityCompositeIdx: index('audit_entity_composite_idx').on(table.entityType, table.entityId),
    userOrgIdx: index('audit_user_org_idx').on(table.userId, table.organizationId)
  })
);
