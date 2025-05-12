import { pgTable, text, timestamp, varchar, boolean, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { EUserRole } from '../../constant/application';

// Removed type PhoneNumber, type AccountConfirmation, type PasswordReset

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 72 }).notNull(),
  emailAddress: varchar('email_address', { length: 255 }).unique().notNull(),

  // PhoneNumber fields
  phoneIsoCode: varchar('phone_iso_code', { length: 10 }).notNull(),
  phoneCountryCode: varchar('phone_country_code', { length: 10 }).notNull(),
  phoneInternationalNumber: varchar('phone_international_number', { length: 20 }).notNull(),

  timezone: varchar('timezone', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default(EUserRole.USER).$type<EUserRole>().notNull(),

  // AccountConfirmation fields
  accountConfirmationStatus: boolean('account_confirmation_status').default(false).notNull(),
  accountConfirmationToken: varchar('account_confirmation_token', { length: 255 }),
  accountConfirmationCode: varchar('account_confirmation_code', { length: 10 }),
  accountConfirmationTimestamp: timestamp('account_confirmation_timestamp'),

  // PasswordReset fields
  passwordResetToken: varchar('password_reset_token', { length: 255 }),
  passwordResetExpiry: timestamp('password_reset_expiry'), // Changed from integer to timestamp for direct comparison
  passwordResetLastResetAt: timestamp('password_reset_last_reset_at'),

  lastLoginAt: timestamp('last_login_at'),
  consent: boolean('consent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
