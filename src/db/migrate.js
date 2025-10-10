import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from '../connections/connectPostgres.js';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const runMigrations = asyncHandler(async () => {
  // Run migrations
  await migrate(db, {
    migrationsFolder: './src/db/migrations',
    migrationsTable: 'drizzle_migrations'
  });

  logger.info('Database migrations completed successfully');
  return true;
});

// Run migrations if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', { meta: { error: error.message } });
      process.exit(1);
    });
}
