import express from 'express';
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
import { httpError } from './utils/httpError.js';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import {
  correlationIdMiddleware,
  limiter,
  metricsMiddleware,
  swaggerDocument
} from './middlewares/serverMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import jobsRoutes from './routes/jobsRoutes.js';
// import oauthRoutes from './routes/oauthRoutes.js';

const server = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
server.use(helmet());

// Add compression middleware
server.use(
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
server.use(metricsMiddleware);

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
server.use('/api/v1/jobs', jobsRoutes);

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
server.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
