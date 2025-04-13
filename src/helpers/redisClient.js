import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

// Otherwise, you can configure it manually: createClient({ socket: { host: '...', port: ... }, password: '...' })
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('connect', () => {
    // logger.info('Connecting to Redis...')
});

// Listen for the 'ready' event indicating the connection is established and ready for commands
redisClient.on('ready', () => {
    // Note: The `client.isOpen` property is true when connected.
    // Note: The `client.isReady` property is true when ready for commands.
    // logger.info('Redis client connected successfully and ready to use.')
});

redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', { error: err });
    // Depending on the error, you might want to attempt reconnection
    // or gracefully shut down the application if Redis is critical.
});

// Optional: Listen for the 'end' event (when the connection closes)
redisClient.on('end', () => {
    logger.warn('Redis client connection closed.');
});
