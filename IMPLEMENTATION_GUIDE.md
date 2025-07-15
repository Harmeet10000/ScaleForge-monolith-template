# 🛠️ Implementation Guide - Security & Performance Fixes

## 🚨 Critical Security Fixes (Immediate Action Required)

### 1. Environment Variables Security

**Create a proper environment template:**

```bash
# .env.template (commit this to git)
# Server Configuration
NODE_ENV=development
PORT=8000
SERVER_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DATABASE=mongodb://localhost:27017/auth-service
DB_POOL_SIZE=10

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# JWT Configuration (Generate strong secrets)
ACCESS_TOKEN_SECRET=
REFRESH_TOKEN_SECRET=
ACCESS_TOKEN_EXPIRY=3600
REFRESH_TOKEN_EXPIRY=604800

# Email Configuration
RESEND_KEY=

# AWS Configuration
AWS_REGION=us-east-1
S3_BUCKET_NAME=
ACCESS_KEY=
SECRET_ACCESS_KEY=
```

**Generate strong JWT secrets:**
```bash
# Run these commands to generate secure secrets
node -e "console.log('ACCESS_TOKEN_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('REFRESH_TOKEN_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Enhanced Database Connection

**Create: `src/db/enhancedConnectDB.js`**
```javascript
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

const connectDB = async () => {
  try {
    const mongoOptions = {
      maxPoolSize: parseInt(process.env.DB_POOL_SIZE) || 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
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
      readyState: conn.connection.readyState,
      poolSize: mongoOptions.maxPoolSize
    });

    // Enhanced connection event handling
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    // Monitor connection pool
    mongoose.connection.on('fullsetup', () => {
      logger.info('MongoDB replica set connection established');
    });

    return true;
  } catch (error) {
    logger.error('MongoDB Connection Error', { 
      error: error.message,
      stack: error.stack 
    });
    return false;
  }
};

export default connectDB;
```

### 3. Enhanced Redis Connection

**Create: `src/db/enhancedConnectRedis.js`**
```javascript
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT) || 6379,
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
};

export const redisClient = new Redis(redisConfig);

// Connection event handlers
redisClient.on('connect', () => {
  logger.info('Redis client connecting...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected and ready');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redisClient.on('close', () => {
  logger.warn('Redis connection closed');
});

redisClient.on('reconnecting', (delay) => {
  logger.info(`Redis reconnecting in ${delay}ms`);
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    
    // Test the connection
    const pong = await redisClient.ping();
    if (pong === 'PONG') {
      logger.info('Redis connection test successful');
      return true;
    }
    throw new Error('Redis ping test failed');
  } catch (error) {
    logger.error('Failed to connect to Redis', { error: error.message });
    throw error;
  }
};

// Graceful shutdown
export const disconnectRedis = async () => {
  try {
    await redisClient.quit();
    logger.info('Redis disconnected gracefully');
  } catch (error) {
    logger.error('Error disconnecting Redis', { error: error.message });
  }
};
```

### 4. Enhanced Security Middleware

**Create: `src/middlewares/securityMiddleware.js`**
```javascript
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import RedisStoreImport from 'rate-limit-redis';
import { redisClient } from '../db/enhancedConnectRedis.js';
import { logger } from '../utils/logger.js';
import { httpResponse } from '../utils/httpResponse.js';

const RedisStore = RedisStoreImport.default || RedisStoreImport;

// Enhanced helmet configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
});

// Rate limiting configurations
const createRateLimiter = (windowMs, max, message, skipSuccessful = false) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args)
    }),
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: skipSuccessful,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.originalUrl,
        method: req.method,
        userAgent: req.get('User-Agent')
      });
      
      httpResponse(req, res, 429, message, null);
    }
  });
};

// Different rate limiters for different endpoints
export const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

export const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per window
  'Too many authentication attempts, please try again later.',
  true // Skip successful requests
);

export const strictLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 requests per hour
  'Rate limit exceeded for sensitive operations.'
);

// IP whitelist middleware (for admin operations)
export const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (process.env.NODE_ENV === 'development') {
      return next(); // Skip in development
    }
    
    if (allowedIPs.length === 0 || allowedIPs.includes(clientIP)) {
      return next();
    }
    
    logger.warn('IP not whitelisted', { ip: clientIP, path: req.originalUrl });
    return httpResponse(req, res, 403, 'Access denied', null);
  };
};
```

### 5. Enhanced CORS Configuration

**Create: `src/middlewares/corsMiddleware.js`**
```javascript
import cors from 'cors';
import { logger } from '../utils/logger.js';

const getAllowedOrigins = () => {
  const origins = process.env.FRONTEND_URL?.split(',') || [];
  
  // In development, allow localhost variations
  if (process.env.NODE_ENV === 'development') {
    return [
      ...origins,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000'
    ];
  }
  
  return origins.filter(origin => origin && origin !== '*');
};

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked request', { origin, allowedOrigins });
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

export const corsMiddleware = cors(corsOptions);
```

## 🚀 Performance Optimizations

### 6. Response Caching Middleware

**Create: `src/middlewares/cacheMiddleware.js`**
```javascript
import { redisClient } from '../db/enhancedConnectRedis.js';
import { logger } from '../utils/logger.js';

export const cacheMiddleware = (duration = 300) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;

    try {
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        logger.debug('Cache hit', { key: cacheKey });
        const parsed = JSON.parse(cachedResponse);
        return res.status(parsed.status).json(parsed.data);
      }

      // Store original res.json
      const originalJson = res.json;
      
      res.json = function(data) {
        // Cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const cacheData = {
            status: res.statusCode,
            data: data
          };
          
          redisClient.setex(cacheKey, duration, JSON.stringify(cacheData))
            .catch(err => logger.error('Cache set error', { error: err.message }));
        }
        
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error: error.message });
      next();
    }
  };
};

export const clearCache = async (pattern = '*') => {
  try {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      logger.info('Cache cleared', { pattern, count: keys.length });
    }
  } catch (error) {
    logger.error('Cache clear error', { error: error.message });
  }
};
```

### 7. Database Indexing Strategy

**Create: `src/db/createIndexes.js`**
```javascript
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

export const createDatabaseIndexes = async () => {
  try {
    const db = mongoose.connection.db;
    
    // User collection indexes
    await db.collection('users').createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { refreshToken: 1 }, sparse: true },
      { key: { resetPasswordToken: 1 }, sparse: true },
      { key: { confirmationToken: 1 }, sparse: true },
      { key: { createdAt: 1 } },
      { key: { isActive: 1, isVerified: 1 } }
    ]);

    // Session collection indexes (if using database sessions)
    await db.collection('sessions').createIndexes([
      { key: { sessionId: 1 }, unique: true },
      { key: { userId: 1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 }
    ]);

    // Audit logs indexes
    await db.collection('auditlogs').createIndexes([
      { key: { userId: 1, createdAt: -1 } },
      { key: { action: 1, createdAt: -1 } },
      { key: { createdAt: 1 }, expireAfterSeconds: 2592000 } // 30 days TTL
    ]);

    logger.info('Database indexes created successfully');
  } catch (error) {
    logger.error('Error creating database indexes', { error: error.message });
  }
};
```

### 8. Health Check Enhancement

**Create: `src/controllers/enhancedHealthController.js`**
```javascript
import mongoose from 'mongoose';
import { redisClient } from '../db/enhancedConnectRedis.js';
import { httpResponse } from '../utils/httpResponse.js';
import { catchAsync } from '../utils/catchAsync.js';

export const healthCheck = catchAsync(async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV,
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  httpResponse(req, res, 200, 'Service is healthy', health);
});

export const detailedHealthCheck = catchAsync(async (req, res) => {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    memory: checkMemory(),
    disk: await checkDisk()
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'healthy');
  const status = isHealthy ? 'healthy' : 'unhealthy';
  const statusCode = isHealthy ? 200 : 503;

  const health = {
    status,
    timestamp: new Date().toISOString(),
    checks,
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  };

  httpResponse(req, res, statusCode, `Service is ${status}`, health);
});

const checkDatabase = async () => {
  try {
    const state = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    if (state === 1) {
      // Test with a simple query
      await mongoose.connection.db.admin().ping();
      return {
        status: 'healthy',
        state: states[state],
        responseTime: Date.now()
      };
    }
    
    return {
      status: 'unhealthy',
      state: states[state],
      error: 'Database not connected'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

const checkRedis = async () => {
  try {
    const start = Date.now();
    await redisClient.ping();
    const responseTime = Date.now() - start;
    
    return {
      status: 'healthy',
      responseTime,
      connection: redisClient.status
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      connection: redisClient.status
    };
  }
};

const checkMemory = () => {
  const usage = process.memoryUsage();
  const totalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const usagePercent = Math.round((usage.heapUsed / usage.heapTotal) * 100);
  
  return {
    status: usagePercent < 90 ? 'healthy' : 'warning',
    totalMB,
    usedMB,
    usagePercent
  };
};

const checkDisk = async () => {
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat('.');
    
    return {
      status: 'healthy',
      accessible: true
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};
```

## 📊 Monitoring & Observability

### 9. Enhanced Logging Configuration

**Create: `src/utils/enhancedLogger.js`**
```javascript
import winston from 'winston';
import 'winston-mongodb';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      ...meta
    });
  })
);

const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Add MongoDB transport for production
if (process.env.NODE_ENV === 'production' && process.env.DATABASE) {
  transports.push(
    new winston.transports.MongoDB({
      db: process.env.DATABASE,
      collection: 'logs',
      level: 'error',
      capped: true,
      cappedSize: 10000000, // 10MB
      cappedMax: 1000
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports,
  exitOnError: false
});

// Performance logging helper
export const logPerformance = (operation, startTime, metadata = {}) => {
  const duration = Date.now() - startTime;
  logger.info('Performance metric', {
    operation,
    duration,
    ...metadata
  });
};
```

This implementation guide provides immediate, actionable fixes for your authentication service. Each section can be implemented incrementally without breaking existing functionality.

**Next Steps:**
1. Implement the critical security fixes first
2. Test each enhancement in development
3. Deploy incrementally to production
4. Monitor performance improvements

Would you like me to create additional implementation files or dive deeper into any specific area?
