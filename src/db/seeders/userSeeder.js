import { getDB } from '../../connections/connectPostgres.js';
import { users } from '../schema/userSchema.js';
import { logger } from '../../utils/logger.js';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

export const seedUsers = async () => {
  try {
    const db = getDB();

    logger.info('Seeding users...');

    // Check if admin user already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.emailAddress, 'admin@example.com'))
      .limit(1);

    if (existingAdmin.length > 0) {
      logger.info('Admin user already exists, skipping user seeding');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin@123', 12);

    // Create admin user
    const adminUser = {
      name: 'System Administrator',
      emailAddress: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true,
      isVerified: true,
      accountConfirmation: {
        status: true,
        code: null,
        token: null,
        timestamp: new Date()
      },
      profile: {
        avatar: null,
        bio: 'System Administrator',
        location: 'System',
        website: null
      },
      security: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        loginAttempts: 0,
        lockUntil: null,
        lastLogin: null,
        ipWhitelist: []
      },
      preferences: {
        language: 'en',
        timezone: 'UTC',
        notifications: {
          email: true,
          push: true,
          sms: false
        }
      }
    };

    // Insert admin user
    const [insertedUser] = await db.insert(users).values(adminUser).returning();

    logger.info('Admin user created successfully', {
      meta: { userId: insertedUser.id, email: insertedUser.emailAddress }
    });

    // Create test user
    const testUserPassword = await bcrypt.hash('Test@123', 12);
    const testUser = {
      name: 'Test User',
      emailAddress: 'test@example.com',
      password: testUserPassword,
      role: 'user',
      isActive: true,
      isVerified: true,
      accountConfirmation: {
        status: true,
        code: null,
        token: null,
        timestamp: new Date()
      }
    };

    const [insertedTestUser] = await db.insert(users).values(testUser).returning();

    logger.info('Test user created successfully', {
      meta: { userId: insertedTestUser.id, email: insertedTestUser.emailAddress }
    });

    logger.info('User seeding completed');
  } catch (error) {
    logger.error('User seeding failed:', { meta: { error: error.message } });
    throw error;
  }
};
