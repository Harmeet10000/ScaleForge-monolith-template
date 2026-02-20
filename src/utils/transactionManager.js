import asyncHandler from 'express-async-handler';
import { logger } from './logger.js';
// import { withTransaction } from '../connections/connectDB.js';

const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 100, // ms
  MAX_DELAY: 2000 // ms
};

const TRANSACTION_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  PAYMENT_CREATION: 30000,
  PAYMENT_VERIFICATION: 30000,
  SUBSCRIPTION_RENEWAL: 45000, // Longer due to multiple updates
  REFUND: 45000,
  WEBHOOK: 60000 // Longest due to potential cascading updates
};

/**
 * Execute a callback function within a MongoDB transaction with retry logic
 * Automatically handles session creation, error recovery, and logging
 *
 * @param {Function} callback - Async function to execute within transaction
 * @param {Object} options - Configuration options
 * @param {mongoose.ClientSession} options.session - Existing session for nested operations
 * @param {string} options.transactionName - Name for logging (required for monitoring)
 * @param {number} options.maxRetries - Max retry attempts for transient errors (default: 3)
 * @param {string} options.transactionType - Type of transaction for timeout lookup
 * @param {string} options.correlationId - Correlation ID for tracing
 * @returns {Promise<*>} Result from callback function
 * @throws {Error} After max retries or on non-transient errors
 *
 * @example
 * const result = await executeInTransaction(
 *   async (session) => {
 *     // Your transactional code here
 *     await Payment.updateOne({ _id }, { status: 'completed' }, { session });
 *     return { success: true };
 *   },
 *   { transactionName: 'payment_verification', transactionType: 'PAYMENT_VERIFICATION' }
 * );
 */
export const executeInTransaction = asyncHandler(
  async (
    callback,
    {
      session = null,
      transactionName = 'unknown',
      maxRetries = RETRY_CONFIG.MAX_RETRIES,
      transactionType = 'DEFAULT',
      correlationId = null
    } = {}
  ) => {
    let retryCount = 0;
    let lastError = null;

    // Get timeout for transaction type
    const timeout = TRANSACTION_TIMEOUTS[transactionType] || TRANSACTION_TIMEOUTS.DEFAULT;

    while (retryCount <= maxRetries) {
      try {
        // const result = await withTransaction(callback, {
        //   session,
        //   transactionName,
        //   _sessionTimeout: timeout
        // });

        if (retryCount > 0) {
          logger.info(`Transaction succeeded after ${retryCount} retries`, {
            meta: {
              transactionName,
              correlationId,
              retryCount,
              transactionType
            }
          });
        } else {
          logger.debug(`Transaction executed successfully`, {
            meta: {
              transactionName,
              correlationId,
              transactionType
            }
          });
        }

        return null; // result;
      } catch (error) {
        lastError = error;

        // Check if error is transient (retryable)
        const isTransient = isTransientError(error);
        const shouldRetry = isTransient && retryCount < maxRetries;

        if (!shouldRetry) {
          logger.error(`Transaction failed after ${retryCount} attempts`, {
            meta: {
              transactionName,
              correlationId,
              error: error.message,
              errorCode: error.code,
              isTransient,
              retryCount,
              transactionType
            }
          });

          // Add correlation ID to error for upstream handling
          if (correlationId) {
            error.correlationId = correlationId;
          }
          throw error;
        }

        // Calculate exponential backoff delay
        const delay = Math.min(
          RETRY_CONFIG.INITIAL_DELAY * Math.pow(2, retryCount),
          RETRY_CONFIG.MAX_DELAY
        );

        logger.warn(`Transaction failed, retrying in ${delay}ms`, {
          meta: {
            transactionName,
            correlationId,
            error: error.message,
            retryCount: retryCount + 1,
            maxRetries,
            delay,
            transactionType
          }
        });

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, delay));
        retryCount += 1;
      }
    }

    // Should not reach here, but just in case
    throw lastError || new Error('Transaction failed without error details');
  }
);

/**
 * Determine if an error is transient and should trigger a retry
 * Transient errors: network timeouts, session errors, write conflicts
 * Non-transient errors: validation, business logic, authentication
 *
 * @param {Error} error - Error to evaluate
 * @returns {boolean} True if error is transient and retryable
 */
function isTransientError(error) {
  // MongoDB transient error codes
  const transientErrorCodes = [
    112, // WriteConflict
    251, // NoReplicationSet
    10107, // NotMaster
    13435, // NotMasterNoSlaveOK
    189, // PrimarySteppedDown
    91, // ShutdownInProgress
    34, // CannotGrow (memory issue)
    4712500, // FailedToSatisfyReadPreference
    26603, // NamespaceNotFound (create collection retry)
    50
  ];

  // Check error code
  if (error.code && transientErrorCodes.includes(error.code)) {
    return true;
  }

  // Check error name for known transient patterns
  const transientPatterns = [
    'MongoServerError',
    'MongoWriteConcernError',
    'MongoNetworkError',
    'MongoTimeoutError',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH'
  ];

  if (transientPatterns.some((pattern) => error.name?.includes(pattern))) {
    return true;
  }

  // Check error message
  const transientMessages = [
    'connection',
    'timeout',
    'closed',
    'Interrupted',
    'NoReplicationSet',
    'DuplicateKeyError',
    'write conflict'
  ];

  if (transientMessages.some((msg) => error.message?.includes(msg))) {
    return true;
  }

  return false;
}

/**
 * Get the current active transaction timeout
 * Used for monitoring and alerting
 *
 * @param {string} transactionType - Type of transaction
 * @returns {number} Timeout in milliseconds
 */
export const getTransactionTimeout = (transactionType = 'DEFAULT') =>
  TRANSACTION_TIMEOUTS[transactionType] || TRANSACTION_TIMEOUTS.DEFAULT;

/**
 * Get all available transaction timeouts (for configuration/monitoring)
 *
 * @returns {Object} Map of transaction types to timeouts
 */
export const getTransactionTimeouts = () => ({ ...TRANSACTION_TIMEOUTS });

/**
 * Create a context-aware transaction wrapper for a specific transaction type
 * Useful for reducing boilerplate in service methods
 *
 * @param {string} transactionType - Type of transaction (for timeout lookup)
 * @param {string} namePrefix - Prefix for transaction name logging
 * @returns {Function} Wrapper function for transactions
 *
 * @example
 * const paymentTxn = createTransactionContext('PAYMENT_VERIFICATION', 'payment');
 * const result = await paymentTxn(async (session) => {
 *   // transaction code
 * }, { correlationId });
 */
export const createTransactionContext = (transactionType = 'DEFAULT', namePrefix = 'txn') => {
  asyncHandler(async (callback, options = {}) => {
    const { correlationId = null, operationId = null } = options;
    const transactionName = `${namePrefix}_${operationId || Date.now()}`;

    return executeInTransaction(callback, {
      transactionName,
      transactionType,
      correlationId,
      ...options
    });
  });
};

export { TRANSACTION_TIMEOUTS, RETRY_CONFIG };
