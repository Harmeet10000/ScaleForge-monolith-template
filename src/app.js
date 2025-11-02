import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import timeout from 'express-timeout-handler';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from '../docs/swagger.js';
import { httpError } from './utils/httpError.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import {
  correlationIdMiddleware,
  corsOptions,
  limiter,
  metricsMiddleware,
  overloadProtector,
  securityHeaders
} from './middlewares/serverMiddleware.js';
import authRoutes from './features/auth/authRoutes.js';
import healthRoutes from './features/health/healthRoutes.js';
import permissionsRoutes from './features/permissions/permissionsRoutes.js';
import searchRoutes from './features/search/searchRoutes.js';
import paymentsRoutes from './features/payments/paymentsRoutes.js';
import subscriptionRoutes from './features/subscription/subscriptionRoutes.js';
import recommendationsRoutes from './features/recommendations/recommendationsRoutes.js';
import notificationRoutes from './features/notifications/notificationRoutes.js';
import s3Routes from './features/storage/s3Routes.js';
import geminiRoutes from './features/gemini/geminiRoutes.js';
import auditRoutes from './features/audit/auditRoutes.js';
import { logger } from './utils/logger.js';

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set request timeout to 30 seconds
app.use(
  timeout.handler({
    timeout: 30000,
    onTimeout: (req, res, next) => {
      logger.warn('Request timed out', {
        meta: { correlationId: req.correlationId, url: req.originalUrl }
      });
      httpError(next, new Error('Request took too long to process'), req, 408);
    }
  })
);

// Set security HTTP headers and  Data sanitization against XSS
app.use(securityHeaders);

// Add overload protection as one of the first middlewares
app.use(overloadProtector);

// Add compression middleware
app.use(
  compression({
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        // Don't compress responses with this header
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 15 * 1000
  })
);

app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '64kb' }));

// Middleware to handle URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: ['sort', 'fields', 'page', 'limit', 'filter', 'search', 'category', 'tags', 'status']
  })
);

app.use(cors(corsOptions));

// Apply Prometheus metrics middleware - must be before routes
app.use(metricsMiddleware);

// 3) ROUTES
// Swagger setup
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    // customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      // docExpansion: 'none',
      filter: true,
      showRequestDuration: true
    }
  })
);

app.use(correlationIdMiddleware);

// Endpoint to serve the swagger.json file
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Auth Service API 🚀.' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/health', healthRoutes);
app.use('/api/v1/permissions', permissionsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/payments', paymentsRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/upload', s3Routes);
app.use('/api/v1/gemini', geminiRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
app.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

app.use(globalErrorHandler);

export default app;
