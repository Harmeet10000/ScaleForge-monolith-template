import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import passport from 'passport';
import './config/passport.js';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import RedisStore from 'rate-limit-redis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { httpError } from './utils/httpError.js';
import { logger } from './utils/logger.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import { correlationIdMiddleware } from './middlewares/corelationMiddleware.js';
import { redisClient } from './db/connectRedis.js';
import { httpResponse } from './utils/httpResponse.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import rabbitmqRoutes from './routes/rabbitmqRoutes.js';
import oauthRoutes from './routes/oauthRoutes.js';

// import promBundle from 'express-prom-bundle';
// import { register } from 'prom-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prometheus metrics setup
// const metricsMiddleware = promBundle({
//   includeMethod: true,
//   includePath: true,
//   includeStatusCode: true,
//   includeUp: true,
//   customLabels: { project: 'auth-service' },
//   promClient: {
//     collectDefaultMetrics: {
//       timestamps: true
//     }
//   }
// });

// Read the swagger document - with proper error handling
let swaggerDocument;
try {
  swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../docs/swagger-output.json'), 'utf8')
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

const server = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
server.use(helmet());

// Add compression middleware
server.use(
  compression({
    // Compression level (0-9), 6 is the default compression level
    level: 6,
    // Filter function to decide which responses to compress - skips small responses
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        // Don't compress responses with this header
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 15 * 1000 // Only compress responses above 15KB
  })
);

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
const limiter = rateLimit({
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

server.use('/api', limiter);

// Body parser, reading data from body into req.body
server.use(express.json({ limit: '16kb' }));

// Middleware to handle URL-encoded data
server.use(express.urlencoded({ extended: true }));

// Parse cookies
server.use(cookieParser());

// Data sanitization against NoSQL query injection
server.use(mongoSanitize());

// Data sanitization against XSS
server.use(xss());

// Prevent parameter pollution
server.use(
  hpp({
    whitelist: []
  })
);

const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

server.use(cors(corsOptions));

// Apply Prometheus metrics middleware - must be before routes
// server.use(metricsMiddleware);

// Initialize Passport
server.use(passport.initialize());

// 3) ROUTES
// Swagger setup
server.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    }
  })
);

// Prometheus metrics endpoint
// server.get('/metrics', async (req, res) => {
//   res.set('Content-Type', register.contentType);
//   res.end(await register.metrics());
// });

server.use(correlationIdMiddleware);

// Endpoint to serve the swagger.json file
server.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
server.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Auth Service API 🚀.' });
});
server.use('/api/v1/auth', authRoutes);
server.use('/api/v1/health', healthRoutes);
server.use('/api/v1/rabbitmq', rabbitmqRoutes);
// server.use('/api/v1/users', userRoutes)

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
server.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
