import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
// import xss from 'xss'
// import hpp from "hpp";
import cors from 'cors';
import globalErrorHandler from './middlewares/globalErrorHandler.js';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/authRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import { httpError } from './utils/httpError.js';
import { logger } from './utils/logger.js';
// import requestLogger from './utils/requestLogger'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      description: "Documentation not available. Run 'npm run generate-swagger' to generate it."
    }
  };
}

const server = express();

// 1) GLOBAL MIDDLEWARES
// Set security HTTP headers
server.use(helmet());

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
// server.use(xss())

// Prevent parameter pollution
// server.use(
//   hpp({
//     whitelist: [
//     ],
//   })
// );

const corsOptions = {
  origin: [process.env.FRONTEND_URL],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true
};

server.use(cors(corsOptions));

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

// Endpoint to serve the swagger.json file
server.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerDocument);
});
server.use('/health', healthRoutes);
server.use('/api/v1/auth', authRoutes);
// server.use('/api/v1/users', userRoutes)

// 4) CATCHES ALL ROUTES THAT ARE NOT DEFINED
server.all('*', (req, res, next) => {
  httpError(next, new Error(`Can't find ${req.originalUrl} on this server!`), req, 404);
});

server.use(globalErrorHandler);

export default server;
