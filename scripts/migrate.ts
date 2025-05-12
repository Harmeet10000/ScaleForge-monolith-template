import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { logger } from '../src/utils/logger'; // Assuming logger is JS compatible or you have a JS version
import config from '../src/config/dotenvConfig'; // To get DATABASE_URL and NODE_ENV

const sql = neon(config.DATABASE);
const db = drizzle(sql);

const runMigrations = async () => {
  logger.info('🚀 Starting database migration...');
  try {
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    logger.info('✅ Database migration completed successfully.');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Database migration failed:', {
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
};

runMigrations();

export { runMigrations };
