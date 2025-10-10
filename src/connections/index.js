import { connectDB } from './connectDB.js';
import { connectPostgres, disconnectPostgres } from './connectPostgres.js';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const initializeDatabases = asyncHandler(async () => {
  try {
    logger.info('Initializing database connections...');

    // Connect to MongoDB (existing)
    await connectDB();

    // Connect to PostgreSQL (new)
    await connectPostgres();

    logger.info('All database connections established successfully');
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', {
      meta: { error: error.message }
    });
    throw error;
  }
});

export const closeDatabases = asyncHandler(async () => {
  try {
    logger.info('Closing database connections...');

    // Close PostgreSQL connection
    await disconnectPostgres();

    // MongoDB connection will be closed by mongoose

    logger.info('All database connections closed');
    return true;
  } catch (error) {
    logger.error('Error closing database connections:', {
      meta: { error: error.message }
    });
    throw error;
  }
});

// Export individual connections
export { connectDB } from './connectDB.js';
export { connectPostgres, getDB, getSQL, disconnectPostgres } from './connectPostgres.js';
