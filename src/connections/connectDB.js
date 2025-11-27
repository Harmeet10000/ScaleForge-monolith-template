import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const connectDB = asyncHandler(async () => {
  const mongoOptions = {
    maxPoolSize: process.env.DB_POOL_SIZE || 10,
    minPoolSize: 2,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    readPreference: 'secondaryPreferred',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 5000
    },
    readConcern: { level: 'majority' }
  };

  const conn = await mongoose.connect(process.env.DATABASE, mongoOptions);

  logger.info(`MongoDB Connected: ${conn.connection.host}`, {
    meta: {
      readyState: conn.connection.readyState,
      poolSize: mongoOptions.maxPoolSize
    }
  });

  // Handle connection events
  mongoose.connection.on('connecting', () => {
    logger.info('MongoDB client connecting...');
  });

  mongoose.connection.on('connected', () => {
    logger.info('MongoDB client connected and ready');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB client error:', { meta: { error: err.message } });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection closed');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB client reconnected');
  });

  mongoose.connection.on('close', () => {
    logger.warn('MongoDB connection ended');
  });

  mongoose.connection.on('fullsetup', () => {
    logger.info('MongoDB replica set connection established');
  });

  return true;
});

export const disconnectMongo = asyncHandler(async () => {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully.');
});

/**
 * Start a new MongoDB session for transaction support
 * @returns {Promise<mongoose.ClientSession>} Active session with transaction started
 * @throws {Error} If session creation fails or replica set not available
 */
export const startSession = asyncHandler(async () => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction({
      readConcern: { level: 'majority' },
      writeConcern: { w: 'majority', j: true },
      readPreference: 'primary',
      maxCommitTimeMS: parseInt(process.env.TRANSACTION_TIMEOUT_MS || '60000', 10)
    });

    logger.debug('Transaction session started', {
      meta: { sessionId: session.id }
    });

    return session;
  } catch (error) {
    logger.error('Failed to start transaction session', {
      meta: { error: error.message, cause: error.cause?.message }
    });
    throw new Error(
      `Transaction session creation failed: ${error.message}. Ensure MongoDB is running as a replica set.`
    );
  }
});

/**
 * Execute a callback function within a MongoDB transaction
 * Automatically handles session lifecycle and rollback on errors
 * @param {Function} callback - Async function to execute within transaction
 * @param {Object} options - Configuration options
 * @param {mongoose.ClientSession} options.session - Existing session (if provided, won't create new one)
 * @param {number} options.sessionTimeout - Transaction timeout in ms (overrides default)
 * @param {string} options.transactionName - Name for logging purposes
 * @returns {Promise<*>} Result from callback function
 * @throws {Error} Rethrows errors from callback after rollback
 */
export const withTransaction = asyncHandler(
  async (
    callback,
    { session = null, _sessionTimeout = null, transactionName = 'unknown' } = {}
  ) => {
    let ownSession = false;
    let currentSession = session;

    if (!currentSession) {
      currentSession = await startSession();
      ownSession = true;
    }

    try {
      const result = await callback(currentSession);

      if (ownSession) {
        await currentSession.commitTransaction();
        logger.debug(`Transaction committed: ${transactionName}`, {
          meta: { transactionName, sessionId: currentSession.id }
        });
      }

      return result;
    } catch (error) {
      if (ownSession) {
        await currentSession.abortTransaction();
        logger.warn(`Transaction aborted: ${transactionName}`, {
          meta: { transactionName, sessionId: currentSession.id, error: error.message }
        });
      }
      throw error;
    } finally {
      if (ownSession) {
        await currentSession.endSession();
        logger.debug('Transaction session ended', {
          meta: { sessionId: currentSession.id }
        });
      }
    }
  }
);
