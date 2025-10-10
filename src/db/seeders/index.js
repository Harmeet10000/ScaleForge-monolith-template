import { seedUsers } from './userSeeder.js';
import { seedAuditEntries } from './auditSeeder.js';
import { logger } from '../../utils/logger.js';
import { connectPostgres } from '../../connections/connectPostgres.js';
import asyncHandler from 'express-async-handler';

export const runSeeders = asyncHandler(async () => {
  try {
    // Ensure database connection
    await connectPostgres();

    logger.info('Starting database seeding...');

    // Run seeders in order
    await seedUsers();
    await seedAuditEntries();

    logger.info('Database seeding completed successfully');
    return true;
  } catch (error) {
    logger.error('Seeding failed:', { meta: { error: error.message } });
    throw error;
  }
});

// Run seeders if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runSeeders()
    .then(() => {
      logger.info('Seeding script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding script failed:', { meta: { error: error.message } });
      process.exit(1);
    });
}
