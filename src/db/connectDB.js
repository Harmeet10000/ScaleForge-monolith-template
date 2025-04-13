import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(process.env.DATABASE);
        logger.info(`\nDatabase connection successful!\nDB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        logger.error('Database connection failed', { error });
        process.exit(1);
    }
};

export default connectDB;
