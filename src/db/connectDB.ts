import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import config from '../config/dotenvConfig.js';

const connectDB = async (): Promise<boolean> => {
  try {
    // Check if DATABASE connection string exists
    if (!config.DATABASE) {
      throw new Error('DATABASE connection string is not defined in environment variables');
    }

    const conn = await mongoose.connect(config.DATABASE, {
      maxPoolSize: config.DB_POOL_SIZE || 10
    });

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    return true;
  } catch (error) {
    logger.error('MongoDB Connection Error', { error: (error as Error).message });
    return false;
  }
};

export default connectDB;
