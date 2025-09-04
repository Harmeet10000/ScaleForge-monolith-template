import * as AuthMessagingService from './authMessagingService.js';
import * as BaseService from '../core/baseService.js';
import { logger } from '../../../utils/logger.js';
import asyncHandler from 'express-async-handler';

/**
 * Functional Auth Producer - Pure functions for publishing auth events
 * No classes, just composable functions that controllers can use
 */

// ==================== PRODUCER STATE MANAGEMENT ====================

/**
 * Create producer state
 */
export const createProducerState = () => ({
  initialized: false,
  serviceState: null
});

/**
 * Initialize producer
 */
const initializeProducer = asyncHandler(async (producerState) => {
  if (producerState.initialized) {return producerState;}

  const serviceState = await AuthMessagingService.initializeAuthService();

  logger.info('Auth Producer initialized');

  return {
    initialized: true,
    serviceState
  };
});

/**
 * Ensure producer is initialized
 */
const ensureInitialized = asyncHandler(async (producerState) => {
   producerState.initialized ? producerState : await initializeProducer(producerState);
});

// ==================== CORE PUBLISHING FUNCTIONS ====================

/**
 * Publish user registration event
 */
export const publishUserRegistered = asyncHandler(async (producerState, user, confirmationData) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishUserRegistered(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress,
    name: user.name,
    confirmationToken: confirmationData.token,
    confirmationCode: confirmationData.code
  });

  logger.info('User registration event published', {
    meta: {
      userId: user._id,
      email: user.emailAddress,
      messageId: result.messageId
    }
  });

  return { result, state };
});

/**
 * Publish user login event
 */
export const publishUserLogin = asyncHandler(async (producerState, user, loginContext) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishUserLogin(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress,
    ip: loginContext.ip,
    userAgent: loginContext.userAgent,
    loginMethod: loginContext.method || 'password'
  }).catch((error) => {
    logger.error('Failed to publish user login event', {
      meta: {
        userId: user._id,
        email: user.emailAddress,
        error: error.message
      }
    });
    // Don't throw - login should succeed even if event publishing fails
    return { result: null };
  });

  if (result) {
    logger.info('User login event published', {
      meta: {
        userId: user._id,
        email: user.emailAddress,
        messageId: result.messageId
      }
    });
  }

  return { result, state };
});

/**
 * Publish user logout event
 */
export const publishUserLogout = asyncHandler(async (producerState, userId, sessionData = {}) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishUserLogout(state.serviceState, {
    userId: userId.toString(),
    sessionId: sessionData.sessionId
  }).catch((error) => {
    logger.error('Failed to publish user logout event', {
      meta: {
        userId,
        error: error.message
      }
    });
    // Don't throw - logout should succeed even if event publishing fails
    return { result: null };
  });

  if (result) {
    logger.info('User logout event published', {
      meta: {
        userId,
        messageId: result.messageId
      }
    });
  }

  return { result, state };
});

/**
 * Publish password reset request event
 */
export const publishPasswordResetRequested = asyncHandler(async (producerState, user, resetToken, expiresAt) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishPasswordResetRequested(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress,
    resetToken,
    expiresAt
  });

  logger.info('Password reset request event published', {
    meta: {
      userId: user._id,
      email: user.emailAddress,
      messageId: result.messageId
    }
  });

  return { result, state };
});

/**
 * Publish password reset completed event
 */
export const publishPasswordResetCompleted = asyncHandler(async (producerState, user) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishPasswordResetCompleted(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress
  });

  logger.info('Password reset completed event published', {
    meta: {
      userId: user._id,
      email: user.emailAddress,
      messageId: result.messageId
    }
  });

  return { result, state };
});

/**
 * Publish account confirmation event
 */
export const publishAccountConfirmed = asyncHandler(async (producerState, user) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishAccountConfirmed(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress
  });

  logger.info('Account confirmation event published', {
    meta: {
      userId: user._id,
      email: user.emailAddress,
      messageId: result.messageId
    }
  });

  return { result, state };
});

/**
 * Publish suspicious activity event
 */
export const publishSuspiciousActivity = asyncHandler(async (producerState, user, activityData) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishSuspiciousActivity(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress,
    activityType: activityData.type,
    ip: activityData.ip,
    userAgent: activityData.userAgent,
    details: activityData.details
  }).catch((error) => {
    logger.error('Failed to publish suspicious activity event', {
      meta: {
        userId: user._id,
        email: user.emailAddress,
        activityType: activityData.type,
        error: error.message
      }
    });
    // Don't throw - security detection should continue even if event publishing fails
    return { result: null };
  });

  if (result) {
    logger.warn('Suspicious activity event published', {
      meta: {
        userId: user._id,
        email: user.emailAddress,
        activityType: activityData.type,
        messageId: result.messageId
      }
    });
  }

  return { result, state };
});

/**
 * Publish account locked event
 */
export const publishAccountLocked = asyncHandler(async (producerState, user, lockReason, lockDuration = null) => {
  const state = await ensureInitialized(producerState);

  const { result } = await AuthMessagingService.publishAccountLocked(state.serviceState, {
    userId: user._id.toString(),
    email: user.emailAddress,
    reason: lockReason,
    lockDuration
  });

  logger.warn('Account locked event published', {
    meta: {
      userId: user._id,
      email: user.emailAddress,
      reason: lockReason,
      messageId: result.messageId
    }
  });

  return { result, state };
});

// ==================== BATCH OPERATIONS ====================

/**
 * Publish multiple events in batch
 */
export const publishBatch = asyncHandler(async (producerState, events) => {
  const state = await ensureInitialized(producerState);

  const results = [];
  const errors = [];

  for (const event of events) {
    const eventResult = await processEvent(state, event).catch((error) => {
      errors.push({ type: event.type, error: error.message, success: false });
      return null;
    });

    if (eventResult) {
      results.push({ type: event.type, result: eventResult.result, success: true });
    }
  }

  logger.info('Batch event publishing completed', {
    meta: {
      totalEvents: events.length,
      successful: results.length,
      failed: errors.length
    }
  });

  return { results, errors, success: errors.length === 0, state };
});

/**
 * Process individual event in batch
 */
const processEvent = asyncHandler(async (state, event) => {
  switch (event.type) {
    case 'user.registered':
      return publishUserRegistered(state, event.user, event.confirmationData);
    case 'user.login':
      return publishUserLogin(state, event.user, event.loginContext);
    case 'user.logout':
      return publishUserLogout(state, event.userId, event.sessionData);
    case 'password.reset.requested':
      return publishPasswordResetRequested(state, event.user, event.resetToken, event.expiresAt);
    case 'password.reset.completed':
      return publishPasswordResetCompleted(state, event.user);
    case 'account.confirmed':
      return publishAccountConfirmed(state, event.user);
    case 'suspicious.activity':
      return publishSuspiciousActivity(state, event.user, event.activityData);
    case 'account.locked':
      return publishAccountLocked(state, event.user, event.lockReason, event.lockDuration);
    default:
      throw new Error(`Unknown event type: ${event.type}`);
  }
});

// ==================== HEALTH CHECK ====================

/**
 * Producer health check
 */
export const producerHealthCheck = asyncHandler(async (producerState) => {
  const state = await ensureInitialized(producerState);
  const serviceHealth = await AuthMessagingService.authServiceHealthCheck(state.serviceState);

  return {
    status: 'healthy',
    producer: 'auth',
    initialized: state.initialized,
    service: serviceHealth
  };
});

// ==================== HIGHER-ORDER FUNCTIONS ====================

/**
 * Create a curried publisher function
 */
export const createPublisher = (producerState) => ({
  userRegistered: (user, confirmationData) => publishUserRegistered(producerState, user, confirmationData),
  userLogin: (user, loginContext) => publishUserLogin(producerState, user, loginContext),
  userLogout: (userId, sessionData) => publishUserLogout(producerState, userId, sessionData),
  passwordResetRequested: (user, resetToken, expiresAt) => publishPasswordResetRequested(producerState, user, resetToken, expiresAt),
  passwordResetCompleted: (user) => publishPasswordResetCompleted(producerState, user),
  accountConfirmed: (user) => publishAccountConfirmed(producerState, user),
  suspiciousActivity: (user, activityData) => publishSuspiciousActivity(producerState, user, activityData),
  accountLocked: (user, lockReason, lockDuration) => publishAccountLocked(producerState, user, lockReason, lockDuration),
  batch: (events) => publishBatch(producerState, events),
  healthCheck: () => producerHealthCheck(producerState)
});

/**
 * Create a safe publisher that doesn't throw on non-critical events
 */
export const createSafePublisher = (producerState) => {
  const publisher = createPublisher(producerState);

  return {
    ...publisher,
    userLogin: async (user, loginContext) => {
      const result = await BaseService.safePublishMessage(producerState, 'user.login', {
        userId: user._id.toString(),
        email: user.emailAddress,
        ip: loginContext.ip,
        userAgent: loginContext.userAgent,
        loginMethod: loginContext.method || 'password'
      });
      return result;
    },
    userLogout: async (userId, sessionData) => {
      const result = await BaseService.safePublishMessage(producerState, 'user.logout', {
        userId: userId.toString(),
        sessionId: sessionData?.sessionId
      });
      return result;
    },
    suspiciousActivity: async (user, activityData) => {
      const result = await BaseService.safePublishMessage(producerState, 'security.suspicious.activity', {
        userId: user._id.toString(),
        email: user.emailAddress,
        activityType: activityData.type,
        ip: activityData.ip,
        userAgent: activityData.userAgent,
        details: activityData.details
      });
      return result;
    }
  };
};

/**
 * Create a publisher with automatic retry
 */
export const createRetryPublisher = (producerState, maxRetries = 3, delay = 1000) => {
  const publisher = createPublisher(producerState);

  const retryWrapper = (fn) => {
    async (...args) => {
      await BaseService.retryOperation(() => fn(...args), maxRetries, delay);
    };
  };

  return {
    userRegistered: retryWrapper(publisher.userRegistered),
    userLogin: retryWrapper(publisher.userLogin),
    userLogout: retryWrapper(publisher.userLogout),
    passwordResetRequested: retryWrapper(publisher.passwordResetRequested),
    passwordResetCompleted: retryWrapper(publisher.passwordResetCompleted),
    accountConfirmed: retryWrapper(publisher.accountConfirmed),
    suspiciousActivity: retryWrapper(publisher.suspiciousActivity),
    accountLocked: retryWrapper(publisher.accountLocked),
    batch: retryWrapper(publisher.batch),
    healthCheck: retryWrapper(publisher.healthCheck)
  };
};

/**
 * Create a publisher with logging
 */
export const createLoggedPublisher = (producerState, logLevel = 'info') => {
  const publisher = createPublisher(producerState);

  const logWrapper = (fn) => {
     async (...args) => {
       await BaseService.logFunctionExecution(fn, logLevel, ...args);
    };
  };

  return {
    userRegistered: logWrapper(publisher.userRegistered),
    userLogin: logWrapper(publisher.userLogin),
    userLogout: logWrapper(publisher.userLogout),
    passwordResetRequested: logWrapper(publisher.passwordResetRequested),
    passwordResetCompleted: logWrapper(publisher.passwordResetCompleted),
    accountConfirmed: logWrapper(publisher.accountConfirmed),
    suspiciousActivity: logWrapper(publisher.suspiciousActivity),
    accountLocked: logWrapper(publisher.accountLocked),
    batch: logWrapper(publisher.batch),
    healthCheck: logWrapper(publisher.healthCheck)
  };
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Execute multiple publisher operations in sequence
 */
export const executePublisherOperations = asyncHandler(async (producerState, operations) => {
  let currentState = producerState;
  const results = [];

  for (const operation of operations) {
    const result = await operation(currentState);
    results.push(result.result);
    currentState = result.state;
  }

  return { results, state: currentState };
});

/**
 * Execute publisher operations in pipeline
 */
export const executePublisherPipeline = asyncHandler(async (producerState, publishers) => {
  let currentState = producerState;

  for (const publisher of publishers) {
    currentState = await publisher(currentState);
  }

  return currentState;
});

/**
 * Transform user data before publishing
 */
export const publishWithTransformedUser = asyncHandler(async (producerState, user, transformer, publishFn, ...args) => {
  const transformedUser = transformer(user);
  return publishFn(producerState, transformedUser, ...args);
});

/**
 * Publish message with correlation ID
 */
export const publishWithCorrelationId = asyncHandler(async (producerState, publishFn, correlationId, ...args) => {
  const lastArg = args[args.length - 1];
  const options = typeof lastArg === 'object' && lastArg !== null ? lastArg : {};
  const newOptions = { ...options, correlationId };

  return publishFn(producerState, ...args.slice(0, -1), newOptions);
});

// ==================== SAFE OPERATIONS ====================

/**
 * Safe publisher functions
 */
export const safePublishUserRegistered = asyncHandler(async (producerState, user, confirmationData) => {
  const result = await BaseService.safePublishMessage(producerState, 'user.registered', {
    userId: user._id.toString(),
    email: user.emailAddress,
    name: user.name,
    confirmationToken: confirmationData.token,
    confirmationCode: confirmationData.code
  });
  return result;
});

export const safePublishUserLogin = asyncHandler(async (producerState, user, loginContext) => {
  const result = await BaseService.safePublishMessage(producerState, 'user.login', {
    userId: user._id.toString(),
    email: user.emailAddress,
    ip: loginContext.ip,
    userAgent: loginContext.userAgent,
    loginMethod: loginContext.method || 'password'
  });
  return result;
});

export const safePublishUserLogout = asyncHandler(async (producerState, userId, sessionData) => {
  const result = await BaseService.safePublishMessage(producerState, 'user.logout', {
    userId: userId.toString(),
    sessionId: sessionData?.sessionId
  });
  return result;
});

export const safePublishPasswordResetRequested = asyncHandler(async (producerState, user, resetToken, expiresAt) => {
  const result = await BaseService.safePublishMessage(producerState, 'password.reset.requested', {
    userId: user._id.toString(),
    email: user.emailAddress,
    resetToken,
    expiresAt
  });
  return result;
});

export const safePublishPasswordResetCompleted = asyncHandler(async (producerState, user) => {
  const result = await BaseService.safePublishMessage(producerState, 'password.reset.completed', {
    userId: user._id.toString(),
    email: user.emailAddress
  });
  return result;
});

export const safePublishAccountConfirmed = asyncHandler(async (producerState, user) => {
  const result = await BaseService.safePublishMessage(producerState, 'account.confirmed', {
    userId: user._id.toString(),
    email: user.emailAddress
  });
  return result;
});

export const safePublishSuspiciousActivity = asyncHandler(async (producerState, user, activityData) => {
  const result = await BaseService.safePublishMessage(producerState, 'security.suspicious.activity', {
    userId: user._id.toString(),
    email: user.emailAddress,
    activityType: activityData.type,
    ip: activityData.ip,
    userAgent: activityData.userAgent,
    details: activityData.details
  });
  return result;
});

export const safePublishAccountLocked = asyncHandler(async (producerState, user, lockReason, lockDuration) => {
  const result = await BaseService.safePublishMessage(producerState, 'account.locked', {
    userId: user._id.toString(),
    email: user.emailAddress,
    reason: lockReason,
    lockDuration
  });
  return result;
});

/**
 * Execute multiple safe operations in sequence
 */
export const executeSafePublishers = asyncHandler(async (producerState, publishers, data) => {
  const results = [];

  for (const publisher of publishers) {
    const result = await publisher(producerState, data);
    results.push(result);
    if (!result.success) {
      break;
    }
  }

  return results;
});

// ==================== SINGLETON STATE MANAGEMENT ====================

/**
 * Global producer state (mutable for singleton pattern)
 */
let globalProducerState = createProducerState();

/**
 * Get global producer state
 */
export const getGlobalProducerState = () => globalProducerState;

/**
 * Update global producer state
 */
export const updateGlobalProducerState = (updates) => {
  globalProducerState = { ...globalProducerState, ...updates };
  return globalProducerState;
};

/**
 * Reset global producer state
 */
export const resetGlobalProducerState = () => {
  globalProducerState = createProducerState();
  return globalProducerState;
};

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Quick publish functions using global state
 */
export const quickPublishUserRegistered = asyncHandler(async (user, confirmationData) =>
  publishUserRegistered(globalProducerState, user, confirmationData));

export const quickPublishUserLogin = asyncHandler(async (user, loginContext) =>
  publishUserLogin(globalProducerState, user, loginContext));

export const quickPublishUserLogout = asyncHandler(async (userId, sessionData) =>
  publishUserLogout(globalProducerState, userId, sessionData));

export const quickPublishPasswordResetRequested = asyncHandler(async (user, resetToken, expiresAt) =>
  publishPasswordResetRequested(globalProducerState, user, resetToken, expiresAt));

export const quickPublishPasswordResetCompleted = asyncHandler(async (user) =>
  publishPasswordResetCompleted(globalProducerState, user));

export const quickPublishAccountConfirmed = asyncHandler(async (user) =>
  publishAccountConfirmed(globalProducerState, user));

export const quickPublishSuspiciousActivity = asyncHandler(async (user, activityData) =>
  publishSuspiciousActivity(globalProducerState, user, activityData));

export const quickPublishAccountLocked = asyncHandler(async (user, lockReason, lockDuration) =>
  publishAccountLocked(globalProducerState, user, lockReason, lockDuration));

/**
 * Create global publisher instance
 */
export const globalAuthPublisher = createPublisher(globalProducerState);
