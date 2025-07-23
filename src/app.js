import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import xss from 'xss-clean';
import hpp from 'hpp';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { httpError } from './utils/httpError.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import {
  correlationIdMiddleware,
  limiter,
  metricsMiddleware,
  securityHeaders,
  swaggerDocument
} from './middlewares/serverMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// 1) GLOBAL MIDDLEWARES
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
    whitelist: []
  })
);

const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

app.use(cors(corsOptions));

// Apply Prometheus metrics middleware - must be before routes
app.use(metricsMiddleware);

// 3) ROUTES
// Swagger setup
app.use(
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
// app.get('/metrics', async (req, res) => {u
//   res.set('Content-Type', register.contentType);
//   res.end(await register.metrics());
// });

app.use(correlationIdMiddleware);

// Endpoint to serve the swagger.json file
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Auth Service API 🚀.' });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/health', healthRoutes);
// app.use('/api/v1/rabbitmq', rabbitmqRoutes);

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
app.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

app.use(globalErrorHandler);

export default app;
