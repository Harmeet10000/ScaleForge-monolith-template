import { pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
  // Note: PostgreSQL does not have a direct equivalent to MongoDB's TTL indexes
  // for automatic document expiration based on a field.
  // Expired token cleanup would need to be handled by application logic
  // or a scheduled database task (e.g., a cron job running a DELETE query).
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
