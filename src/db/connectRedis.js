import { redisClient } from '../helpers/redisClient.js';
import { logger } from '../utils/logger.js';

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.info('Redis connect() method called successfully.');
    } catch (err) {
        logger.error('Failed to initiate Redis connection:', { error: err });
        process.exit(1);
    }
};
