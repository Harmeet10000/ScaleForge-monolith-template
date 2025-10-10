import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  jsonb,
  varchar,
  index
} from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const users = pgTable(
  'users',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    name: varchar('name', { length: 255 }).notNull(),
    emailAddress: varchar('email_address', { length: 255 }).notNull().unique(),
    password: text('password').notNull(),
    phoneNumber: varchar('phone_number', { length: 20 }),

    // Account confirmation
    accountConfirmation: jsonb('account_confirmation').default({
      status: false,
      code: null,
      token: null,
      timestamp: null
    }),

    // Password reset
    passwordReset: jsonb('password_reset').default({
      token: null,
      timestamp: null,
      attempts: 0
    }),

    // Profile information
    profile: jsonb('profile').default({
      avatar: null,
      bio: null,
      location: null,
      website: null
    }),

    // Security settings
    security: jsonb('security').default({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: null,
      ipWhitelist: []
    }),

    // Preferences
    preferences: jsonb('preferences').default({
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        push: true,
        sms: false
      }
    }),

    // Status and metadata
    isActive: boolean('is_active').default(true),
    isVerified: boolean('is_verified').default(false),
    role: varchar('role', { length: 50 }).default('user'),
    organizationId: uuid('organization_id'),

    // Timestamps
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
    deletedAt: timestamp('deleted_at')
  },
  (table) => ({
    emailIdx: index('users_email_idx').on(table.emailAddress),
    organizationIdx: index('users_organization_idx').on(table.organizationId),
    roleIdx: index('users_role_idx').on(table.role),
    activeIdx: index('users_active_idx').on(table.isActive),
    createdAtIdx: index('users_created_at_idx').on(table.createdAt)
  })
);
