import express from 'express';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import xss from 'xss-clean';
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
  securityHeaders
} from './middlewares/serverMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import permissionsRoutes from './routes/permissionsRoutes.js';

const app = express();

// 1) GLOBAL MIDDLEWARES
// Set request timeout to 10 seconds
app.use(
  timeout.handler({
    timeout: 10000,
    onTimeout: (req, res, next) => {
      httpError(next, new Error('Request took too long to process'), req, 408);
    }
  })
);

// Set security HTTP headers
app.use(securityHeaders);

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
app.use(express.json({ limit: '16kb' }));

// Middleware to handle URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Parse cookies
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      // 'sort',
      // 'fields',
      // 'page',
      // 'limit',
      // 'filter',
      // 'search',
      // 'category',
      // 'tags',
      // 'status'
    ]
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
// app.use('/api/v1/rabbitmq', rabbitmqRoutes);

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
app.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

app.use(globalErrorHandler);

export default app;
