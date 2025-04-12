import './config/dotenvConfig.js';
import app from './app.js';
import connectDB from './db/connectDB.js';
import { logger } from './utils/logger.js';
import { redisClient } from './helpers/redisClient.js';
import { connectRedis } from './db/connectRedis.js';

// --- Connect to Databases ---
// Use Promise.all to connect concurrently, or connect sequentially if preferred/needed
Promise.all([connectDB(), connectRedis()])
    .then(() => {

        const server = app.listen(process.env.PORT || 8000, () => {
            logger.info(`Server is running at port: ${process.env.PORT || 8000}, in ${process.env.NODE_ENV} mode`);
        });

        process.on('unhandledRejection', (err) => {
            logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
            server.close(async () => {
                if (redisClient.isOpen) {
                    try {
                        await redisClient.quit(); // Waits for pending replies then disconnects
                        // or use redisClient.disconnect(); // Disconnects immediately
                        logger.info('Redis client disconnected gracefully.');
                    } catch (redisErr) {
                        logger.error('Error during Redis disconnection on unhandledRejection:', { error: redisErr });
                    }
                }
                process.exit(1);
            });
        });

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            server.close(async () => {
                if (redisClient.isOpen) {
                    try {
                        await redisClient.quit();
                        logger.info('Redis client disconnected gracefully.');
                    } catch (redisErr) {
                        logger.error('Error during Redis disconnection on SIGTERM:', { error: redisErr });
                    }
                }
                logger.info('HTTP server closed. Process terminated!');
                process.exit(0);
            });
        });
    })
    .catch((err) => {
        logger.error('Application startup failed!', { error: err });
        process.exit(1);
    });
