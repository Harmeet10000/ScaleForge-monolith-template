import * as BaseService from '../core/baseService.js';
import * as MessageBroker from '../core/messageBroker.js';
import { logger } from '../../../utils/logger.js';
import { httpError } from '../../../utils/httpError.js';
import { Resendmail } from '../../email.js';
import * as authRepository from '../../../features/auth/authRepository.js';
import { deleteHash } from '../../cache/redisFunctions.js';
import asyncHandler from 'express-async-handler';
import Joi from 'joi';

/**
 * Functional Auth Messaging Service
 * Pure functions for auth domain messaging - no classes, just composable functions
 */

// ==================== SCHEMA DEFINITIONS ====================

/**
 * Auth message schemas
 */
const authSchemas = {
  'user.registered': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    confirmationToken: Joi.string().required(),
    confirmationCode: Joi.string().required(),
    timestamp: Joi.date().iso().required()
  }),

  'user.login': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    ip: Joi.string().ip().required(),
    userAgent: Joi.string().optional(),
    timestamp: Joi.date().iso().required(),
    loginMethod: Joi.string().valid('password', 'oauth', 'sso').default('password')
  }),

  'user.logout': Joi.object({
    userId: Joi.string().required(),
    sessionId: Joi.string().optional(),
    timestamp: Joi.date().iso().required()
  }),

  'password.reset.requested': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    resetToken: Joi.string().required(),
    expiresAt: Joi.date().iso().required(),
    timestamp: Joi.date().iso().required()
  }),

  'password.reset.completed': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    timestamp: Joi.date().iso().required()
  }),

  'account.confirmed': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    timestamp: Joi.date().iso().required()
  }),

  'security.suspicious.activity': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    activityType: Joi.string().required(),
    ip: Joi.string().ip().required(),
    userAgent: Joi.string().optional(),
    details: Joi.object().optional(),
    timestamp: Joi.date().iso().required()
  }),

  'account.locked': Joi.object({
    userId: Joi.string().required(),
    email: Joi.string().email().required(),
    reason: Joi.string().required(),
    lockDuration: Joi.number().optional(),
    timestamp: Joi.date().iso().required()
  })
};

// ==================== QUEUE CONFIGURATIONS ====================

/**
 * Auth queue configurations
 */
const authQueueConfigs = [
  {
    name: 'auth.user.registered',
    options: {
      durable: true,
      maxPriority: 5,
      arguments: { 'x-max-retries': 5 }
    }
  },
  {
    name: 'auth.user.login',
    options: { durable: true, maxPriority: 3 }
  },
  {
    name: 'auth.user.logout',
    options: { durable: true, maxPriority: 2 }
  },
  {
    name: 'auth.password.reset.requested',
    options: { durable: true, maxPriority: 8 }
  },
  {
    name: 'auth.password.reset.completed',
    options: { durable: true, maxPriority: 5 }
  },
  {
    name: 'auth.account.confirmed',
    options: { durable: true, maxPriority: 5 }
  },
  {
    name: 'auth.security.suspicious.activity',
    options: { durable: true, maxPriority: 10 }
  },
  {
    name: 'auth.account.locked',
    options: { durable: true, maxPriority: 9 }
  }
];

// ==================== MESSAGE HANDLERS ====================

/**
 * Handle user registration event
 */
const handleUserRegistered = asyncHandler(async (data, metadata) => {
  logger.info('Processing user registration event', {
    meta: { userId: data.userId, email: data.email }
  });

  // Send welcome email with confirmation
  const emailInfo = {
    to: [data.email],
    subject: 'Welcome! Please Confirm Your Account',
    name: data.name,
    confirmationUrl: `${process.env.FRONTEND_URL}/confirmation/${data.email}?code=${data.confirmationCode}`,
    code: data.confirmationCode,
    purpose: 'accountConfirmation'
  };

  await Resendmail(emailInfo);

  logger.info('User registration processed successfully', {
    meta: { userId: data.userId, email: data.email }
  });
});

/**
 * Handle user login event
 */
const handleUserLogin = asyncHandler(async (data, metadata) => {
  logger.info('Processing user login event', {
    meta: { userId: data.userId, email: data.email, ip: data.ip }
  });

  // Update last login timestamp
  await authRepository.updateUserLastLogin(data.userId);

  // Check for suspicious login patterns
  await checkSuspiciousLogin(data);

  logger.info('User login processed successfully', {
    meta: { userId: data.userId, email: data.email }
  });
});

/**
 * Handle user logout event
 */
const handleUserLogout = asyncHandler(async (data, metadata) => {
  logger.info('Processing user logout event', {
    meta: { userId: data.userId }
  });

  // Clear user cache
  await deleteHash('user', `id:${data.userId}`);

  logger.info('User logout processed successfully', {
    meta: { userId: data.userId }
  });
});

/**
 * Handle password reset request
 */
const handlePasswordResetRequested = asyncHandler(async (data, metadata) => {
  logger.info('Processing password reset request', {
    meta: { userId: data.userId, email: data.email }
  });

  // Send password reset email
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${data.resetToken}`;

  const emailInfo = {
    to: [data.email],
    subject: 'Password Reset Request',
    name: data.name || 'User',
    resetUrl,
    confirmationUrl: resetUrl,
    purpose: 'requestPasswordReset'
  };

  await Resendmail(emailInfo);

  logger.info('Password reset request processed successfully', {
    meta: { userId: data.userId, email: data.email }
  });
});

/**
 * Handle password reset completed
 */
const handlePasswordResetCompleted = asyncHandler(async (data, metadata) => {
  logger.info('Processing password reset completion', {
    meta: { userId: data.userId, email: data.email }
  });

  // Send confirmation email
  const emailInfo = {
    to: [data.email],
    subject: 'Password Reset Successful',
    name: data.name || 'User',
    purpose: 'resetUserPassword'
  };

  await Resendmail(emailInfo);

  // Clear user cache (force re-authentication)
  await deleteHash('user', `id:${data.userId}`);
  await deleteHash('user', `email:${data.email}`);

  logger.info('Password reset completion processed successfully', {
    meta: { userId: data.userId, email: data.email }
  });
});

/**
 * Handle account confirmation
 */
const handleAccountConfirmed = asyncHandler(async (data, metadata) => {
  logger.info('Processing account confirmation', {
    meta: { userId: data.userId, email: data.email }
  });

  // Send welcome email
  const emailInfo = {
    to: [data.email],
    subject: 'Welcome! Your Account is Confirmed',
    name: data.name || 'User',
    purpose: 'confirmationSuccess'
  };

  await Resendmail(emailInfo);

  logger.info('Account confirmation processed successfully', {
    meta: { userId: data.userId, email: data.email }
  });
});

/**
 * Handle suspicious activity
 */
const handleSuspiciousActivity = asyncHandler(async (data, metadata) => {
  logger.warn('Processing suspicious activity alert', {
    meta: {
      userId: data.userId,
      email: data.email,
      activityType: data.activityType,
      ip: data.ip
    }
  });

  // Send security alert email
  const emailInfo = {
    to: [data.email],
    subject: 'Security Alert - Suspicious Activity Detected',
    name: data.name || 'User',
    activityType: data.activityType,
    ip: data.ip,
    timestamp: data.timestamp,
    purpose: 'securityAlert'
  };

  await Resendmail(emailInfo);

  logger.warn('Suspicious activity processed successfully', {
    meta: { userId: data.userId, email: data.email, activityType: data.activityType }
  });
});

/**
 * Handle account locked
 */
const handleAccountLocked = asyncHandler(async (data, metadata) => {
  logger.warn('Processing account lock', {
    meta: { userId: data.userId, email: data.email, reason: data.reason }
  });

  // Send account locked notification
  const emailInfo = {
    to: [data.email],
    subject: 'Account Temporarily Locked',
    name: data.name || 'User',
    reason: data.reason,
    lockDuration: data.lockDuration,
    timestamp: data.timestamp,
    purpose: 'accountLocked'
  };

  await Resendmail(emailInfo);

  // Clear all user sessions/cache
  await deleteHash('user', `id:${data.userId}`);
  await deleteHash('user', `email:${data.email}`);

  logger.warn('Account lock processed successfully', {
    meta: { userId: data.userId, email: data.email, reason: data.reason }
  });
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Check for suspicious login patterns
 */
const checkSuspiciousLogin = asyncHandler(async (loginData) => {
  // Implement your suspicious activity detection logic
  // This is a simplified example

  const suspiciousPatterns = [
    // Multiple rapid logins from different IPs
    // Login from unusual geographic location
    // Login outside normal hours
    // etc.
  ];

  // If suspicious activity detected, publish event
  // await publishSuspiciousActivity({...});
});

/**
 * Determine if account should be locked based on activity type
 */
const shouldLockAccount = (activityType) => {
  const lockTriggers = [
    'multiple_failed_logins',
    'brute_force_attempt',
    'suspicious_location',
    'credential_stuffing'
  ];

  return lockTriggers.includes(activityType);
};

// ==================== HANDLER CONFIGURATIONS ====================

/**
 * Auth message handlers with options
 */
const authHandlers = [
  {
    messageType: 'user.registered',
    handler: handleUserRegistered,
    options: { maxRetries: 5, retryDelay: 2000 }
  },
  {
    messageType: 'user.login',
    handler: handleUserLogin,
    options: { maxRetries: 3, retryDelay: 1000 }
  },
  {
    messageType: 'user.logout',
    handler: handleUserLogout,
    options: { maxRetries: 3, retryDelay: 1000 }
  },
  {
    messageType: 'password.reset.requested',
    handler: handlePasswordResetRequested,
    options: { maxRetries: 5, retryDelay: 3000 }
  },
  {
    messageType: 'password.reset.completed',
    handler: handlePasswordResetCompleted,
    options: { maxRetries: 3, retryDelay: 2000 }
  },
  {
    messageType: 'account.confirmed',
    handler: handleAccountConfirmed,
    options: { maxRetries: 3, retryDelay: 2000 }
  },
  {
    messageType: 'security.suspicious.activity',
    handler: handleSuspiciousActivity,
    options: { maxRetries: 5, retryDelay: 1000 }
  },
  {
    messageType: 'account.locked',
    handler: handleAccountLocked,
    options: { maxRetries: 3, retryDelay: 2000 }
  }
];

// ==================== INFRASTRUCTURE SETUP ====================

/**
 * Setup auth-specific infrastructure
 */
const setupAuthInfrastructure = asyncHandler(async (brokerState, serviceState) => {
  let currentBrokerState = brokerState;

  // Ensure all auth queues exist
  for (const queueConfig of authQueueConfigs) {
    currentBrokerState = await MessageBroker.ensureQueue(
      currentBrokerState,
      queueConfig.name,
      queueConfig.options
    );
  }

  logger.info('Auth messaging infrastructure setup completed');
  return currentBrokerState;
});

// ==================== SERVICE CREATION ====================

/**
 * Create auth service state with all configurations
 */
export const createAuthServiceState = () => {
  const baseState = BaseService.createServiceState('auth', {
    exchangeName: 'auth.exchange',
    exchangeType: 'topic',
    queuePrefix: 'auth',
    routingKeyPrefix: 'auth'
  });

  // Add all schemas
  const stateWithSchemas = Object.entries(authSchemas).reduce(
    (state, [messageType, schema]) => BaseService.addSchema(state, messageType, schema),
    baseState
  );

  // Add all handlers
  const stateWithHandlers = authHandlers.reduce(
    (state, { messageType, handler, options }) =>
      BaseService.addHandler(state, messageType, handler, options),
    stateWithSchemas
  );

  return stateWithHandlers;
};

/**
 * Initialize auth service
 */
export const initializeAuthService = asyncHandler(async (state = null) => {
  const serviceState = state || createAuthServiceState();
  return BaseService.initializeService(serviceState, setupAuthInfrastructure);
});

// ==================== MESSAGE PUBLISHING FUNCTIONS ====================

/**
 * Publish user registered event
 */
export const publishUserRegistered = asyncHandler(async (state, userData) => {
  const messageData = {
    userId: userData.userId,
    email: userData.email,
    name: userData.name,
    confirmationToken: userData.confirmationToken,
    confirmationCode: userData.confirmationCode,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'user.registered', messageData, { priority: 5 });
});

/**
 * Publish user login event
 */
export const publishUserLogin = asyncHandler(async (state, loginData) => {
  const messageData = {
    userId: loginData.userId,
    email: loginData.email,
    ip: loginData.ip,
    userAgent: loginData.userAgent,
    loginMethod: loginData.loginMethod || 'password',
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'user.login', messageData, { priority: 3 });
});

/**
 * Publish user logout event
 */
export const publishUserLogout = asyncHandler(async (state, logoutData) => {
  const messageData = {
    userId: logoutData.userId,
    sessionId: logoutData.sessionId,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'user.logout', messageData, { priority: 2 });
});

/**
 * Publish password reset requested event
 */
export const publishPasswordResetRequested = asyncHandler(async (state, resetData) => {
  const messageData = {
    userId: resetData.userId,
    email: resetData.email,
    resetToken: resetData.resetToken,
    expiresAt: resetData.expiresAt,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'password.reset.requested', messageData, { priority: 8 });
});

/**
 * Publish password reset completed event
 */
export const publishPasswordResetCompleted = asyncHandler(async (state, resetData) => {
  const messageData = {
    userId: resetData.userId,
    email: resetData.email,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'password.reset.completed', messageData, { priority: 5 });
});

/**
 * Publish account confirmed event
 */
export const publishAccountConfirmed = asyncHandler(async (state, confirmationData) => {
  const messageData = {
    userId: confirmationData.userId,
    email: confirmationData.email,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'account.confirmed', messageData, { priority: 5 });
});

/**
 * Publish suspicious activity event
 */
export const publishSuspiciousActivity = asyncHandler(async (state, activityData) => {
  const messageData = {
    userId: activityData.userId,
    email: activityData.email,
    activityType: activityData.activityType,
    ip: activityData.ip,
    userAgent: activityData.userAgent,
    details: activityData.details,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'security.suspicious.activity', messageData, { priority: 10 });
});

/**
 * Publish account locked event
 */
export const publishAccountLocked = asyncHandler(async (state, lockData) => {
  const messageData = {
    userId: lockData.userId,
    email: lockData.email,
    reason: lockData.reason,
    lockDuration: lockData.lockDuration,
    timestamp: new Date().toISOString()
  };

  return BaseService.publishServiceMessage(state, 'account.locked', messageData, { priority: 9 });
});

// ==================== CONSUMER MANAGEMENT ====================

/**
 * Start all auth consumers
 */
export const startAuthConsumers = asyncHandler(async (state = null) => {
  const serviceState = state || await initializeAuthService();
  return BaseService.startAllServiceConsumers(serviceState);
});

/**
 * Setup specific auth consumer
 */
export const setupAuthConsumer = asyncHandler(async (state, messageType, options = {}) => {
  const serviceState = state || await initializeAuthService();
  return BaseService.setupServiceConsumer(serviceState, messageType, options);
});

// ==================== HEALTH AND MONITORING ====================

/**
 * Auth service health check
 */
export const authServiceHealthCheck = asyncHandler(async (state = null) => {
  const serviceState = state || await initializeAuthService();
  return BaseService.serviceHealthCheck(serviceState);
});

// ==================== HIGHER-ORDER FUNCTIONS ====================

/**
 * Create auth-specific publisher
 */
export const createAuthPublisher = (state) => ({
  userRegistered: (userData) => publishUserRegistered(state, userData),
  userLogin: (loginData) => publishUserLogin(state, loginData),
  userLogout: (logoutData) => publishUserLogout(state, logoutData),
  passwordResetRequested: (resetData) => publishPasswordResetRequested(state, resetData),
  passwordResetCompleted: (resetData) => publishPasswordResetCompleted(state, resetData),
  accountConfirmed: (confirmationData) => publishAccountConfirmed(state, confirmationData),
  suspiciousActivity: (activityData) => publishSuspiciousActivity(state, activityData),
  accountLocked: (lockData) => publishAccountLocked(state, lockData)
});

/**
 * Create auth-specific consumer manager
 */
export const createAuthConsumerManager = (state) => ({
  startAll: () => startAuthConsumers(state),
  setup: (messageType, options) => setupAuthConsumer(state, messageType, options),
  healthCheck: () => authServiceHealthCheck(state)
});

// ==================== FUNCTIONAL COMPOSITION ====================

/**
 * Compose auth service operations
 */
export const composeAuthOperations = (...operations) =>
  BaseService.composeServiceOperations(...operations);

/**
 * Create and initialize auth service
 */
export const createAndInitializeAuthService = asyncHandler(async () => {
  const serviceState = createAuthServiceState();
  return initializeAuthService(serviceState);
});

/**
 * Batch auth message publishing
 */
export const publishAuthBatch = asyncHandler(async (state, messages) => {
  const serviceState = state || await initializeAuthService();
  return BaseService.publishBatch(serviceState, messages);
});

// ==================== SINGLETON STATE MANAGEMENT ====================

/**
 * Global auth service state (mutable for singleton pattern)
 */
let globalAuthServiceState = null;

/**
 * Get or create global auth service state
 */
export const getGlobalAuthServiceState = asyncHandler(async () => {
  if (!globalAuthServiceState) {
    globalAuthServiceState = await initializeAuthService();
  }
  return globalAuthServiceState;
});

/**
 * Reset global auth service state
 */
export const resetGlobalAuthServiceState = () => {
  globalAuthServiceState = null;
};
