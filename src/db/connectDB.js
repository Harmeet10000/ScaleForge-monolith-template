import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { metrics } from '../utils/metrics/metricsHelper.js';

const connectDB = async () => {
  try {
    metrics.setDbConnected(false); // Set initial state as disconnected

    const conn = await mongoose.connect(process.env.DATABASE, {
      maxPoolSize: process.env.DB_POOL_SIZE || 10
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    metrics.setDbConnected(true); // Update metric after successful connection

    // Track connection events
    mongoose.connection.on('disconnected', () => {
      metrics.setDbConnected(false);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      metrics.setDbConnected(true);
    });

    return true;
  } catch (error) {
    logger.error('MongoDB Connection Error', { error: error.message });
    metrics.setDbConnected(false);
    return false;
  }
};

export default connectDB;
