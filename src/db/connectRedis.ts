import Redis from 'ioredis';
import config from '../config/dotenvConfig';
import { logger } from '../utils/logger';

export const redisClient = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  username: config.REDIS_USERNAME,
  password: config.REDIS_PASSWORD
});

export const connectRedis = async (): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const connectionTimeout = setTimeout(() => {
      reject(new Error('Redis connection timeout after 10000ms'));
    }, 10000);

    redisClient.once('ready', () => {
      clearTimeout(connectionTimeout);
      logger.info('Redis client connected successfully and ready to use.');
      resolve();
    });

    redisClient.once('error', (err: Error) => {
      clearTimeout(connectionTimeout);
      logger.error('Failed to connect to Redis:', { error: err });
      reject(err);
    });

    if (redisClient.status === 'ready') {
      clearTimeout(connectionTimeout);
      logger.info('Redis was already connected.');
      resolve();
    }
  });
};
