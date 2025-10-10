import { getDB } from '../../connections/connectPostgres.js';
import { auditEntries } from '../schema/auditSchema.js';
import { users } from '../schema/userSchema.js';
import { logger } from '../../utils/logger.js';
import { eq } from 'drizzle-orm';

export const seedAuditEntries = async () => {
  try {
    const db = getDB();

    logger.info('Seeding audit entries...');

    // Get admin user for audit entries
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.emailAddress, 'admin@example.com'))
      .limit(1);

    if (adminUser.length === 0) {
      logger.warn('Admin user not found, skipping audit seeding');
      return;
    }

    const userId = adminUser[0].id;

    // Sample audit entries
    const sampleAuditEntries = [
      {
        entityType: 'user',
        entityId: userId,
        operation: 'CREATE',
        status: 'success',
        userId,
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder Script',
        requestId: 'seed-001',
        newData: {
          action: 'User account created',
          details: 'Admin user account created during seeding'
        },
        metadata: {
          source: 'seeder',
          version: '1.0.0'
        },
        tags: ['seeding', 'user-creation']
      },
      {
        entityType: 'system',
        entityId: userId,
        operation: 'SEED',
        status: 'success',
        userId,
        ipAddress: '127.0.0.1',
        userAgent: 'Seeder Script',
        requestId: 'seed-002',
        newData: {
          action: 'Database seeding completed',
          details: 'Initial data seeding process completed successfully'
        },
        metadata: {
          source: 'seeder',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        },
        tags: ['seeding', 'system-initialization']
      }
    ];

    // Insert audit entries
    const insertedEntries = await db.insert(auditEntries).values(sampleAuditEntries).returning();

    logger.info('Audit entries created successfully', {
      meta: { count: insertedEntries.length }
    });

    logger.info('Audit seeding completed');
  } catch (error) {
    logger.error('Audit seeding failed:', { meta: { error: error.message } });
    throw error;
  }
};
