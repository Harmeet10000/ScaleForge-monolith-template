import config from './config/dotenvConfig';
import app from './app';
import { connectDB } from './connections/connectDB';
import { connectRedis, redisClient } from './connections/connectRedis';
import { createConnection, closeConnection } from './connections/connectRabbitMQ';
import { logger } from './utils/logger';
import process from 'process';
import type { Server } from 'http';
import { exec } from 'child_process'; // For running the migration script

const runDbMigrate = (): Promise<void> =>
  new Promise((resolve, reject) => {
    logger.info('🚀 Attempting to run database migrations...');
    const migrateProcess = exec('npm run db:migrate', (error, stdout, stderr) => {
      if (error) {
        logger.error('❌ Migration script execution failed:', {
          message: error.message,
          stdout,
          stderr
        });
        return reject(error);
      }
      if (stderr) {
        logger.warn('Migration script stderr (may include info):', stderr);
      }
      logger.info('Migration script stdout:', stdout);
      logger.info('✅ Database migrations checked/applied successfully via script.');
      resolve();
    });

    migrateProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        // Covered by the callback's error handling, but good for explicit logging
        logger.error(`Migration script exited with code ${code}`);
      }
    });
  });

// Use Promise.all to connect concurrently
Promise.all([connectDB(), connectRedis(), createConnection()])
  .then(async () => {
    // Run migrations, e.g., only in development or if a specific flag is set
    if (config.NODE_ENV === 'development') {
      try {
        await runDbMigrate();
      } catch (migrationError) {
        logger.error('Halting application startup due to migration failure.', {
          error: migrationError
        });
        process.exit(1); // Exit if migrations fail in dev
      }
    } else {
      logger.info('Skipping automatic migrations in non-development environment.');
    }

    const server: Server = app.listen(config.PORT, () => {
      logger.info(`Server is running at port: ${config.PORT}, in ${config.NODE_ENV} mode`);
    });

    // Graceful shutdown function
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed.');

        // Disconnect Redis
        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          try {
            await redisClient.quit();
            logger.info('Redis client disconnected gracefully.');
          } catch (redisErr) {
            logger.error(`Error during Redis disconnection on ${signal}:`, { error: redisErr });
          }
        } else {
          logger.warn('Redis client not connected or already disconnected.');
        }

        // NeonDB connections are automatically managed, no explicit disconnect needed

        // Disconnect RabbitMQ
        try {
          await closeConnection();
          logger.info('RabbitMQ disconnected gracefully.');
        } catch (rabbitmqErr) {
          logger.error(`Error during RabbitMQ disconnection on ${signal}:`, { error: rabbitmqErr });
        }

        logger.info('Process terminated!');
        process.exit(signal === 'unhandledRejection' ? 1 : 0);
      });
    };

    // Handle unexpected errors
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
      void gracefulShutdown('unhandledRejection');
    });

    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });
  })
  .catch((err) => {
    logger.error('Application startup failed!', { error: err });
    // Attempt to disconnect Redis and RabbitMQ on startup failure
    void Promise.allSettled([
      redisClient.status === 'ready' || redisClient.status === 'connect'
        ? redisClient.quit()
        : Promise.resolve(),
      closeConnection().catch(() => Promise.resolve())
    ]).finally(() => {
      process.exit(1);
    });
  });
