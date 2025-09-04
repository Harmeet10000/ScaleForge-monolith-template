import * as AuthProducer from '../services/authProducer.js';
import * as AuthConsumer from '../services/authConsumer.js';
import * as BaseService from '../core/baseService.js';
import * as authService from '../../../features/auth/authService.js';
import * as authRepository from '../../../features/auth/authRepository.js';
import { generateRandomId, generateResetPasswordExpiry } from '../../../utils/helpers.js';
import { connectDB, disconnectMongo } from '../../../config/mongo.js';
import { connectRedis, disconnectRedis } from '../../../config/redis.js';
import { createConnection, disconnectRabbitMQ } from '../../../config/rabbitmq.js';
import { app } from '../../../app.js';
import { checkDatabaseHealth, checkRedisHealth } from '../../../utils/healthChecks.js';
import { logger } from '../../../utils/logger.js';
import { httpError } from '../../../utils/httpError.js';
import { httpResponse } from '../../../utils/httpResponse.js';
import asyncHandler from 'express-async-handler';

/**
 * Functional Integration Examples - How to use the new functional RabbitMQ system
 * Pure functions, immutable state, and functional composition patterns
 */

// ==================== CONTROLLER INTEGRATION EXAMPLES ====================

/**
 * Functional Auth Controller Examples
 * Replace your existing OOP controllers with these functional approaches
 */

/**
 * Register user with functional messaging
 */
export const registerUserController = asyncHandler(async (req, res, next) => {
  // Your existing registration logic
  const userData = req.body;
  const newUser = await authService.registerUser(userData);

  // NEW: Functional message publishing
  const producerState = AuthProducer.getGlobalProducerState();
  const { result } = await AuthProducer.publishUserRegistered(
    producerState,
    newUser,
    {
      token: newUser.accountConfirmation.token,
      code: newUser.accountConfirmation.code
    }
  );

  logger.info('Registration event published', { messageId: result.messageId });

  // Your existing response
  httpResponse(req, res, 201, 'User registered successfully', {
    user: {
      id: newUser._id,
      name: newUser.name,
      emailAddress: newUser.emailAddress
    }
  });
});

/**
 * Login user with functional messaging (non-blocking)
 */
export const loginUserController = asyncHandler(async (req, res, next) => {
  // Your existing login logic
  const credentials = req.body;
  const loginResult = await authService.loginUser(credentials, req, next);

  // NEW: Safe, non-blocking message publishing
  const producerState = AuthProducer.getGlobalProducerState();
  AuthProducer.publishUserLogin(
    producerState,
    loginResult.userForResponse,
    {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: 'password'
    }
  ).catch(error => {
    logger.warn('Failed to publish login event', { error: error.message });
  });

  // Set refresh token cookie
  res.cookie('refreshToken', loginResult.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    domain: loginResult.domain,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  // Your existing response
  httpResponse(req, res, 200, 'Login successful', {
    accessToken: loginResult.accessToken,
    user: loginResult.userForResponse
  });
});

/**
 * Logout user with functional messaging
 */
export const logoutUserController = async (req, res, next) => {
  try {
    const {refreshToken} = req.cookies;

    // Your existing logout logic
    await authService.logoutUser(refreshToken);

    // NEW: Functional message publishing
    if (req.user) {
      const producerState = AuthProducer.getGlobalProducerState();
      AuthProducer.publishUserLogout(
        producerState,
        req.user.userId,
        { sessionId: req.sessionId }
      ).catch(error => {
        logger.warn('Failed to publish logout event', { error: error.message });
      });
    }

    // Clear cookie
    res.clearCookie('refreshToken');

    httpResponse(req, res, 200, 'Logout successful', null);
  } catch (error) {
    httpError(next, error, req, 400);
  }
};

/**
 * Batch operations example - Multiple events in one transaction
 */
export const complexUserOperationController = async (req, res, next) => {
  try {
    // Complex operation that triggers multiple events
    const userData = req.body;
    const user = await performComplexUserOperation(userData);

    // NEW: Batch message publishing with functional approach
    const producerState = AuthProducer.getGlobalProducerState();
    const events = [
      {
        type: 'user.registered',
        user,
        confirmationData: { token: user.token, code: user.code }
      },
      {
        type: 'user.login',
        user,
        loginContext: { ip: req.ip, userAgent: req.get('User-Agent') }
      }
    ];

    const { results, errors, success } = await AuthProducer.publishBatch(producerState, events);

    if (!success) {
      logger.warn('Some events failed to publish', { errors });
    }

    httpResponse(req, res, 201, 'Complex operation completed', {
      user,
      eventsPublished: results.length,
      eventsFailed: errors.length
    });
  } catch (error) {
    httpError(next, error, req, 400);
  }
};

// ==================== SERVICE INTEGRATION EXAMPLES ====================

/**
 * Functional Auth Service Examples
 * Replace your existing OOP services with functional approaches
 */

/**
 * Register user - functional approach
 */
export const functionalRegisterUser = async (userData) => {
  // Your existing registration logic
  const newUser = await authRepository.registerUser(userData);

  // NEW: Functional event publishing (no side effects in service)
  return {
    user: newUser,
    events: [
      {
        type: 'user.registered',
        data: {
          userId: newUser._id.toString(),
          email: newUser.emailAddress,
          name: newUser.name,
          confirmationToken: newUser.accountConfirmation.token,
          confirmationCode: newUser.accountConfirmation.code
        }
      }
    ]
  };
};

/**
 * Request password reset - functional approach
 */
export const functionalRequestPasswordReset = async (emailAddress) => {
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (!user) {
    throw new Error('User not found');
  }

  // Generate reset token
  const token = generateRandomId();
  const expiry = generateResetPasswordExpiry(15);

  // Update user
  user.passwordReset.token = token;
  user.passwordReset.expiry = expiry;
  await user.save();

  // NEW: Return events instead of side effects
  return {
    user,
    events: [
      {
        type: 'password.reset.requested',
        data: {
          userId: user._id.toString(),
          email: user.emailAddress,
          resetToken: token,
          expiresAt: expiry
        }
      }
    ]
  };
};

/**
 * Higher-order function to add event publishing to any service function
 */
export const withEventPublishing = (serviceFn) => async (...args) => {
  const result = await serviceFn(...args);

  if (result.events && result.events.length > 0) {
    const producerState = AuthProducer.getGlobalProducerState();

    // Publish events asynchronously
    result.events.forEach(event => {
      AuthProducer.publishServiceMessage(
        producerState,
        event.type,
        event.data
      ).catch(error => {
        logger.warn(`Failed to publish ${event.type} event`, { error: error.message });
      });
    });
  }

  return result.user || result;
};

// ==================== MIDDLEWARE INTEGRATION EXAMPLES ====================

/**
 * Functional Security Middleware Examples
 */

/**
 * Rate limiting with functional suspicious activity detection
 */
export const functionalRateLimitHandler = (req, res, next, options) => {
  // Your existing rate limit logic
  logger.warn('Rate limit exceeded', {
    correlationId: req.correlationId,
    ip: req.ip,
    path: req.originalUrl,
    method: req.method
  });

  // NEW: Functional suspicious activity publishing
  if (req.user) {
    const producerState = AuthProducer.getGlobalProducerState();
    AuthProducer.publishSuspiciousActivity(
      producerState,
      req.user,
      {
        type: 'rate_limit_exceeded',
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          path: req.originalUrl,
          method: req.method,
          attempts: options.attempts || 1
        }
      }
    ).catch(error => {
      logger.warn('Failed to publish suspicious activity event', { error: error.message });
    });
  }

  // Your existing response
  httpResponse(req, res, options.statusCode, options.message, null);
};

/**
 * Functional failed login tracking
 */
export const trackFailedLoginFunctional = async (req, email, ip) => {
  // Your existing failed login tracking logic
  const failedAttempts = await getFailedLoginAttempts(email, ip);

  if (failedAttempts >= 5) {
    const user = await authRepository.findUserByEmailAddress(email);
    if (user) {
      const producerState = AuthProducer.getGlobalProducerState();

      // Compose multiple events functionally
      const events = [
        {
          type: 'suspicious.activity',
          user,
          activityData: {
            type: 'multiple_failed_logins',
            ip,
            userAgent: req.get('User-Agent'),
            details: { attempts: failedAttempts }
          }
        },
        {
          type: 'account.locked',
          user,
          lockReason: 'Multiple failed login attempts',
          lockDuration: 3600000 // 1 hour
        }
      ];

      // Publish events in sequence
      for (const event of events) {
        try {
          switch (event.type) {
            case 'suspicious.activity':
              await AuthProducer.publishSuspiciousActivity(
                producerState,
                event.user,
                event.activityData
              );
              break;
            case 'account.locked':
              await AuthProducer.publishAccountLocked(
                producerState,
                event.user,
                event.lockReason,
                event.lockDuration
              );
              break;
          }
        } catch (error) {
          logger.warn(`Failed to publish ${event.type} event`, { error: error.message });
        }
      }
    }
  }
};

// ==================== APPLICATION STARTUP EXAMPLES ====================

/**
 * Functional Application Startup
 */
export const functionalApplicationStartup = async () => {
  try {
    // Your existing startup logic
    await Promise.all([connectDB(), connectRedis(), createConnection()]);

    // NEW: Start auth consumers functionally
    logger.info('Starting auth message consumers...');
    const consumerState = AuthConsumer.getGlobalConsumerState();
    const updatedState = await AuthConsumer.startConsumers(consumerState);

    // Update global state
    AuthConsumer.updateGlobalConsumerState(updatedState);

    // Start your server
    const server = app.listen(process.env.PORT, () => {
      logger.info(`Server is running at port: ${process.env.PORT}`);
    });

    // Functional graceful shutdownu
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        // Compose shutdown operations functionally
        const shutdownOps = [
          () => disconnectRedis(),
          () => disconnectMongo(),
          () => disconnectRabbitMQ(),
          () => AuthConsumer.stopConsumers(AuthConsumer.getGlobalConsumerState())
        ];

        await Promise.all(shutdownOps.map(op => op()));
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Application startup failed!', { error });
    process.exit(1);
  }
};

// ==================== HEALTH CHECK EXAMPLES ====================

/**
 * Functional Health Check
 */
export const functionalHealthCheck = async (req, res) => {
  try {
    // Your existing health checks
    const dbHealth = await checkDatabaseHealth();
    const redisHealth = await checkRedisHealth();

    // NEW: Functional messaging health checks
    const producerState = AuthProducer.getGlobalProducerState();
    const consumerState = AuthConsumer.getGlobalConsumerState();

    const [authProducerHealth, authConsumerHealth, authConsumerMetrics] = await Promise.all([
      AuthProducer.producerHealthCheck(producerState),
      AuthConsumer.healthCheck(consumerState),
      AuthConsumer.getMetrics(consumerState)
    ]);

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
        messaging: {
          authProducer: authProducerHealth,
          authConsumer: authConsumerHealth,
          metrics: authConsumerMetrics
        }
      }
    };

    res.status(200).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// ==================== TESTING EXAMPLES ====================

/**
 * Functional Testing Examples
 */

/**
 * Test message publishing functionally
 */
export const testFunctionalPublishing = async () => {
  try {
    const testUser = {
      _id: '507f1f77bcf86cd799439011',
      emailAddress: 'test@example.com',
      name: 'Test User'
    };

    const producerState = AuthProducer.createProducerState();

    // Test user registration event
    const { result } = await AuthProducer.publishUserRegistered(
      producerState,
      testUser,
      {
        token: 'test-token',
        code: 'test-code'
      }
    );

    logger.info('Test message published successfully', { result });
    return result;
  } catch (error) {
    logger.error('Test message publishing failed', { error: error.message });
    throw error;
  }
};

/**
 * Test message processing functionally
 */
export const testFunctionalProcessing = async () => {
  try {
    const testMessage = {
      userId: '507f1f77bcf86cd799439011',
      email: 'test@example.com',
      name: 'Test User',
      confirmationToken: 'test-token',
      confirmationCode: 'test-code',
      timestamp: new Date().toISOString()
    };

    const consumerState = AuthConsumer.createConsumerState();

    // Process message manually
    const { success } = await AuthConsumer.processMessage(
      consumerState,
      'user.registered',
      testMessage,
      {
        messageId: 'test-message-id',
        correlationId: 'test-correlation-id'
      }
    );

    logger.info('Test message processed successfully', { success });
    return success;
  } catch (error) {
    logger.error('Test message processing failed', { error: error.message });
    throw error;
  }
};

// ==================== SIMPLE OPERATION EXAMPLES ====================

/**
 * Execute multiple auth operations
 */
export const executeAuthOperations = asyncHandler(async () => {
  // Initialize producer
  const producerState = AuthProducer.createProducerState();

  // Initialize consumer
  const consumerState = AuthConsumer.createConsumerState();

  // Start services
  const producer = await AuthProducer.initializeProducer(producerState);
  const consumer = await AuthConsumer.startConsumers(consumerState);

  return { producer, consumer };
});

/**
 * Execute user registration process
 */
export const executeUserRegistration = asyncHandler(async (userData) => {
  // Validate user data
  const validatedData = validateUserData(userData);

  // Create user
  const user = await authRepository.registerUser(validatedData);

  // Publish registration event
  const producerState = AuthProducer.getGlobalProducerState();
  await AuthProducer.publishUserRegistered(
    producerState,
    user,
    {
      token: user.accountConfirmation.token,
      code: user.accountConfirmation.code
    }
  );

  return user;
});

/**
 * Execute security event process
 */
export const executeSecurityEventProcess = asyncHandler(async (activityData) => {
  // Detect suspicious activity
  const suspiciousActivity = detectSuspiciousActivity(activityData);

  // Assess threat level
  const threatAssessment = assessThreatLevel(suspiciousActivity);

  // Take appropriate action
  const producerState = AuthProducer.getGlobalProducerState();

  if (threatAssessment.shouldAlert) {
    await AuthProducer.publishSuspiciousActivity(
      producerState,
      threatAssessment.user,
      threatAssessment.activityData
    );
  }

  if (threatAssessment.shouldLock) {
    await AuthProducer.publishAccountLocked(
      producerState,
      threatAssessment.user,
      threatAssessment.lockReason,
      threatAssessment.lockDuration
    );
  }

  return threatAssessment;
});

// ==================== MONITORING EXAMPLES ====================

/**
 * Functional monitoring and metrics collection
 */
export const functionalMessagingMetrics = async () => {
  try {
    const consumerState = AuthConsumer.getGlobalConsumerState();
    const producerState = AuthProducer.getGlobalProducerState();

    const [metrics, producerHealth, consumerHealth] = await Promise.all([
      AuthConsumer.getMetrics(consumerState),
      AuthProducer.producerHealthCheck(producerState),
      AuthConsumer.healthCheck(consumerState)
    ]);

    return {
      timestamp: new Date().toISOString(),
      producer: producerHealth,
      consumer: consumerHealth,
      metrics,
      summary: {
        totalQueues: metrics.queues?.length || 0,
        totalMessages: metrics.queues?.reduce((sum, q) => sum + q.messageCount, 0) || 0,
        totalConsumers: metrics.consumerCount || 0
      }
    };
  } catch (error) {
    logger.error('Failed to get messaging metrics', { error: error.message });
    throw error;
  }
};

/**
 * Functional alert checking
 */
export const functionalAlertCheck = async (threshold = 100) => {
  try {
    const consumerState = AuthConsumer.getGlobalConsumerState();
    const backlogCheck = await AuthConsumer.checkMessageBacklog(consumerState, threshold);

    if (backlogCheck.hasAlerts) {
      // Functional alert handling
      const alertActions = backlogCheck.alerts.map(alert => ({
        type: 'backlog_alert',
        queue: alert.queue,
        messageCount: alert.messageCount,
        action: 'scale_consumers'
      }));

      // Process alerts functionally
      for (const action of alertActions) {
        await handleAlert(action);
      }
    }

    return backlogCheck;
  } catch (error) {
    logger.error('Failed to check alerts', { error: error.message });
    throw error;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Helper functions for the examples
 */
const validateUserData = (userData) => {
  // Your validation logic
   userData;
};

const detectSuspiciousActivity = (activityData) => {
  // Your detection logic
  activityData;
};

const assessThreatLevel = (suspiciousActivity) => {
  // Your threat assessment logic
  return {
    shouldAlert: true,
    shouldLock: false,
    user: suspiciousActivity.user,
    activityData: suspiciousActivity,
    lockReason: null,
    lockDuration: null
  };
};

const handleAlert = async (alert) => {
  logger.warn('Processing alert', { alert });
  // Your alert handling logic
};

const performComplexUserOperation = async (userData) => {
  // Your complex operation logic
  return {
    _id: '507f1f77bcf86cd799439011',
    emailAddress: userData.email,
    name: userData.name,
    token: 'generated-token',
    code: 'generated-code'
  };
};

const getFailedLoginAttempts = async (email, ip) => {
  // Your failed login tracking logic
  return 5;
};

// ==================== EXPORT FUNCTIONAL API ====================

/**
 * Functional API for easy integration
 */
export const FunctionalAuthMessaging = {
  // Producer operations
  producer: {
    create: AuthProducer.createProducerState,
    publish: {
      userRegistered: AuthProducer.publishUserRegistered,
      userLogin: AuthProducer.publishUserLogin,
      userLogout: AuthProducer.publishUserLogout,
      passwordResetRequested: AuthProducer.publishPasswordResetRequested,
      passwordResetCompleted: AuthProducer.publishPasswordResetCompleted,
      accountConfirmed: AuthProducer.publishAccountConfirmed,
      suspiciousActivity: AuthProducer.publishSuspiciousActivity,
      accountLocked: AuthProducer.publishAccountLocked,
      batch: AuthProducer.publishBatch
    },
    healthCheck: AuthProducer.producerHealthCheck
  },

  // Consumer operations
  consumer: {
    create: AuthConsumer.createConsumerState,
    start: AuthConsumer.startConsumers,
    stop: AuthConsumer.stopConsumers,
    restart: AuthConsumer.restartConsumers,
    pause: AuthConsumer.pauseConsumers,
    resume: AuthConsumer.resumeConsumers,
    process: {
      single: AuthConsumer.processMessage,
      batch: AuthConsumer.processBatch
    },
    monitor: {
      status: AuthConsumer.getStatus,
      metrics: AuthConsumer.getMetrics,
      healthCheck: AuthConsumer.healthCheck,
      checkBacklog: AuthConsumer.checkMessageBacklog
    }
  },

  // Utility functions
  utils: {
    executeOperations: executeAuthOperations,
    executeUserRegistration,
    executeSecurityProcess: executeSecurityEventProcess,
    withEventPublishing,
    retryOperation: BaseService.retryOperation,
    logExecution: BaseService.logFunctionExecution
  }
};
