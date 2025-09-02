import swaggerJSDoc from 'swagger-jsdoc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth Template API',
      description: `
        **Production Grade Authentication & Authorization Service**
      `,
      version: '1.0.0',
      contact: {
        name: 'Harmeet Singh',
        email: 'harmeetsinghfbd@gmail.com',
        url: 'https://github.com/Harmeet10000'
      },
      license: {
        name: 'ISC License',
        url: 'https://github.com/Harmeet10000/production-grade-auth-template?tab=ISC-1-ov-file'
      },
      termsOfService: 'https://github.com/Harmeet10000/production-grade-auth-template'
    },
    servers: [
      {
        url: 'http://localhost:8000/api/v1',
        description: 'Development server (Local)'
      },
      {
        url: 'http://auth-service/api/v1',
        description: 'Dockerized server (Container)'
      },
      {
        url: 'https://reasonable-amazement-production.up.railway.app/api/v1',
        description: 'Production server (Railway)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Bearer token authentication. Format: Bearer <token>'
        },
        cookieAuth: {
          type: 'accessToken',
          in: 'cookie',
          name: 'accessToken',
          description: 'Authentication via HTTP-only cookie'
        }
      },
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: { type: 'object', description: 'Response data (varies by endpoint)' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error message description' },
            error: { type: 'string', example: 'Detailed error information' },
            statusCode: { type: 'integer', example: 400 }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }, { cookieAuth: [] }]
  },
  apis: [path.join(__dirname, '../src/features/*/*Routes.js')]
};

// Generate swagger specification
export const swaggerSpec = swaggerJSDoc(options);
