import { pgTable, text, timestamp, serial } from 'drizzle-orm/pg-core';

export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  token: text('token').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
