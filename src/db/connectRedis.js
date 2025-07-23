import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  db: 0,
  connectTimeout: 10000,
  commandTimeout: 5000,
  maxmemoryPolicy: 'allkeys-lru'
});

export const connectRedis = async () =>
  new Promise((resolve, reject) => {
    // With ioredis, connection is automatically initiated when client is created
    // We just need to wait for the 'ready' event or handle errors

    // Set a connection timeout
    const connectionTimeout = setTimeout(() => {
      reject(new Error('Redis connection timeout after 10000ms'));
    }, 10000);

    // Listen for the ready event once
    redisClient.once('ready', () => {
      clearTimeout(connectionTimeout);
      logger.info('Redis client connected successfully and ready to use.');
      resolve();
    });

    // Listen for connection errors
    redisClient.once('error', (err) => {
      clearTimeout(connectionTimeout);
      logger.error('Failed to connect to Redis:', { error: err });
      reject(err);
    });

    // If redis is already ready, resolve immediately
    if (redisClient.status === 'ready') {
      clearTimeout(connectionTimeout);
      logger.info('Redis was already connected.');
      resolve();
    }
  });
