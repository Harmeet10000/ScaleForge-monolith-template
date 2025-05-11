import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { logger } from '../utils/logger';

const sql = neon(process.env.DATABASE!);
export const db = drizzle(sql);

export const initDatabase = async () => {
  try {
    // Test the connection
    await sql`SELECT NOW()`;
    logger.info('Connected to NeonDB successfully');
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};
