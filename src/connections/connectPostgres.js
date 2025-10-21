import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export let db = null;
export let sql = null;

export const connectPostgres = asyncHandler(async () => {
  if (db && sql) {
    return { db, sql };
  }
  // Initialize Neon connection
  sql = neon(process.env.POSTGRES_DATABASE_URL);

  // Initialize Drizzle with Neon
  db = drizzle(sql, {
    logger: process.env.NODE_ENV === 'development'
  });

  // Test connection
  await sql`SELECT 1`;

  logger.info('PostgreSQL Connected via Neon', {
    meta: {
      database: 'neon-postgres',
      environment: process.env.NODE_ENV
    }
  });

  return true;
});

export const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectPostgres() first.');
  }
  return db;
};

export const getSQL = () => {
  if (!sql) {
    throw new Error('SQL client not initialized. Call connectPostgres() first.');
  }
  return sql;
};

// Graceful shutdown
export const disconnectPostgres = asyncHandler(async () => {
  if (sql) {
    // Neon serverless connections are automatically managed
    logger.info('PostgreSQL connection closed');
    db = null;
    sql = null;
  }
});
