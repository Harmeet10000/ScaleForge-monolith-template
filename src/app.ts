import express, { Request, Response, NextFunction, Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import compression from 'compression';
import type { CompressionOptions } from 'compression';
// import xss from 'xss-clean';
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
import oauthRoutes from './routes/oauthRoutes.js'; // Added for OAuth
import passport from './config/passportConfig.js'; // Added for Passport configuration
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

server.use(passport.initialize());

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
server.use(helmet());

server.use(
  compression({
    level: 6,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    },
    threshold: 15 * 1000 
  } as CompressionOptions)
);

const limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
server.use('/api', limiter);
server.use(express.json({ limit: '16kb' }));
server.use(express.urlencoded({ extended: true }));
server.use(cookieParser());
server.use(mongoSanitize());
// server.use(xss());
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

server.get('/swagger.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
// Prometheus metrics endpoint
// server.get('/metrics', async (req, res) => {
//   res.set('Content-Type', register.contentType);
//   res.end(await register.metrics());
// });
server.use('/api/v1/health', healthRoutes);
server.use('/api/v1/auth', authRoutes);
server.use('/api/v1/rabbitmq', rabbitmqRoutes);
server.use('/api/v1/oauth', oauthRoutes); 
// server.use('/api/v1/users', userRoutes)

server.all('*', (req: Request, res: Response, next: NextFunction) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
