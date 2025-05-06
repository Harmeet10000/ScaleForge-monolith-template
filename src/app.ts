import express, { Request, Response, NextFunction, Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import type { CompressionOptions } from 'compression';
import xss from 'xss';
import cors, { CorsOptions } from 'cors';
import hpp from 'hpp';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { httpError } from './utils/httpError.js';
import { logger } from './utils/logger.js';
import config from './config/dotenvConfig.js';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import rabbitmqRoutes from './routes/rabbitmqRoutes.js';
// import promBundle from 'express-prom-bundle';
// import { register } from 'prom-client';
// import { trackRequestMetrics, trackConnections } from './middlewares/metricsMiddleware.js';

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
let swaggerDocument: Record<string, unknown>;
try {
  swaggerDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../docs/swagger-output.json'), 'utf8')
  );
} catch (error) {
  logger.warn('Swagger documentation not found or invalid. API docs will not be available.', {
    error: (error as Error).message
  });
  swaggerDocument = {
    info: {
      title: 'API Documentation',
      description: "Documentation not available. Run 'npm run swagger' to generate it."
    }
  };
}

const server: Express = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
server.use(helmet());

// Add compression middleware - compress all responses
server.use(
  compression({
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      // Compress responses larger than 500 bytes
      return compression.filter(req, res);
    },
    threshold: 50 * 1000 // Only compress responses above 50KB
  } as CompressionOptions)
);

// Limit requests from same API
const limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
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

const corsOptions: CorsOptions = {
  origin: [config.FRONTEND_URL as string],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

server.use(cors(corsOptions));

// Apply Prometheus metrics middleware - must be before routes
// server.use(metricsMiddleware);

// // Apply custom metrics middleware
// server.use(trackRequestMetrics);
// server.use(trackConnections);

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

// Endpoint to serve the swagger.json file
server.get('/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
server.use('/api/v1/health', healthRoutes);
server.use('/api/v1/auth', authRoutes);
server.use('/api/v1/rabbitmq', rabbitmqRoutes);
// server.use('/api/v1/users', userRoutes)

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
server.all('*', (req: Request, res: Response, next: NextFunction) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
