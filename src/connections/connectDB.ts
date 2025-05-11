import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';
import config from '../config/dotenvConfig';

dotenv.config();

// Configure Neon for connection pooling (optional but recommended for serverless environments)
neonConfig.wsProxy = process.env.NEON_WS_PROXY || 'wss://neon.proxy.your-server.com/v1';

const sql = neon(config.DATABASE);

export const db = drizzle(sql);

export const initDatabase = async () => {
  try {
    // Test the connection
    const result = await sql`SELECT NOW()`;
    logger.info(`✅ Connected to NeonDB successfully at ${result[0].now}`);
  } catch (error) {
    logger.error('❌ Database connection failed:', error);
  }
};
