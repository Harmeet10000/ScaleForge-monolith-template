import { pgTable, text, timestamp, varchar, boolean, json } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';
import { EUserRole } from '../../constant/application';

// Define the structure for phoneNumber
type PhoneNumber = {
  isoCode: string;
  countryCode: string;
  internationalNumber: string;
};

// Define the structure for accountConfirmation
type AccountConfirmation = {
  status: boolean;
  token: string;
  code: string;
  timestamp: Date | null;
};

// Define the structure for passwordReset
type PasswordReset = {
  token: string | null;
  expiry: number | null;
  lastResetAt: Date | null;
};

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar('name', { length: 72 }).notNull(),
  emailAddress: varchar('email_address', { length: 255 }).unique().notNull(),
  phoneNumber: json('phone_number').$type<PhoneNumber>().notNull(),
  timezone: varchar('timezone', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default(EUserRole.USER).$type<EUserRole>().notNull(),
  accountConfirmation: json('account_confirmation').$type<AccountConfirmation>().notNull(),
  passwordReset: json('password_reset').$type<PasswordReset>(),
  lastLoginAt: timestamp('last_login_at'),
  consent: boolean('consent').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
