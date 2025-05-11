import { migrate } from 'drizzle-orm/neon-http/migrator';
import { db } from '../config/database';
import { logger } from '../utils/logger';

async function runMigrations() {
  try {
    logger.info('Running migrations...');
    await migrate(db, { migrationsFolder: 'drizzle' });
    logger.info('Migrations completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
