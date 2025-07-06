import { nanoid } from 'nanoid';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { httpResponse } from '../utils/httpResponse.js';
import RedisStore from 'rate-limit-redis';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../db/connectRedis.js';
import promBundle from 'express-prom-bundle';
// import { register } from 'prom-client';

export const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = nanoid();
  next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Read the swagger document - with proper error handling
export let swaggerDocument;
try {
  swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../../docs/swagger-output.json'), 'utf8')
  );
} catch (error) {
  logger.warn('Swagger documentation not found or invalid. API docs will not be available.', {
    error: error.message
  });
  swaggerDocument = {
    info: {
      title: 'API Documentation',
      description: "Documentation not available. Run 'npm run swagger' to generate it."
    }
  };
}

const rateLimitHandler = (req, res, next, options) => {
  logger.warn('Rate limit exceeded', {
    correlationId: req.correlationId,
    ip: req.ip,
    path: req.originalUrl,
    method: req.method
  });
  httpResponse(
    req,
    res,
    options.statusCode,
    options.message || 'Too many requests, please try again later.',
    null
  );
};
// Limit requests from same API
export const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args)
  }),
  max: 100,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in 15 minutes!',
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler
});

export const metricsMiddleware = promBundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
  customLabels: { project: 'auth-service' },
  promClient: {
    collectDefaultMetrics: {
      timestamps: true
    }
  }
});
