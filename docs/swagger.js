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
        // User: {
        //   type: 'object',
        //   properties: {
        //     id: { type: 'string', example: '507f1f77bcf86cd799439011' },
        //     email: { type: 'string', format: 'email', example: 'user@example.com' },
        //     username: { type: 'string', example: 'john_doe' },
        //     firstName: { type: 'string', example: 'John' },
        //     lastName: { type: 'string', example: 'Doe' },
        //     role: { type: 'string', enum: ['user', 'admin', 'moderator'], example: 'user' },
        //     isVerified: { type: 'boolean', example: true },
        //     isActive: { type: 'boolean', example: true },
        //     createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' },
        //     updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00.000Z' }
        //   }
        // },
      }
    },
    tags: [
      {
        name: 'Authentication',
        description:
          'User authentication and authorization endpoints including login, registration, password reset, and token management'
      },
      { name: 'Health', description: 'System health check and status monitoring endpoints' },
      {
        name: 'Permissions',
        description: 'Role-based access control and permission management endpoints'
      },
      { name: 'Search', description: 'Search using Elasticsearch' }
    ],
    security: [{ bearerAuth: [] }, { cookieAuth: [] }]
  },
  apis: [path.join(__dirname, '../src/routes/*.js')]
};

// Generate swagger specification
export const swaggerSpec = swaggerJSDoc(options);
