import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const connectDB = asyncHandler(async () => {
  const mongoOptions = {
    maxPoolSize: process.env.DB_POOL_SIZE || 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    readPreference: 'secondaryPreferred',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 5000
    },
    readConcern: { level: 'majority' }
  };

  const conn = await mongoose.connect(process.env.DATABASE, mongoOptions);

  logger.info(`MongoDB Connected: ${conn.connection.host}`, {
    meta: {
      readyState: conn.connection.readyState,
      poolSize: mongoOptions.maxPoolSize
    }
  });

  // Enhanced connection event handling
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  // Monitor connection pool
  mongoose.connection.on('fullsetup', () => {
    logger.info('MongoDB replica set connection established');
  });

  return true;
});
