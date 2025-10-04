import Redis from 'ioredis';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 120000,
  family: 4,
  db: 0,
  connectTimeout: 120000,
  commandTimeout: 5000,
  maxmemoryPolicy: 'allkeys-lru',
  enableAutoPipelining: true,
  autoResubscribe: true,
  autoResendUnfulfilledCommands: true
});

// Handle reconnection events
redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected and ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', { meta: { error: err.message } });
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('reconnecting', (delay) => {
  logger.info(`Redis client reconnecting in ${delay}ms`);
});

redisClient.on('end', () => {
  logger.warn('Redis connection ended');
});

export const connectRedis = asyncHandler(async () => {
  if (redisClient.status === 'ready') {
    logger.info('Redis already connected');
    return;
  }

  await redisClient.connect();
});
