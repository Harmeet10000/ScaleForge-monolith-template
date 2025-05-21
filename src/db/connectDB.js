import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE, {
      maxPoolSize: process.env.DB_POOL_SIZE || 10
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Track connection events
    mongoose.connection.on('disconnected', () => {});

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return true;
  } catch (error) {
    logger.error('MongoDB Connection Error', { error: error.message });
    return false;
  }
};

export default connectDB;
