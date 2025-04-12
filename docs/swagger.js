import swaggerAutogen from 'swagger-autogen';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outputFile = path.join(__dirname, './swagger-output.json');
const endpointsFiles = [
  path.join(__dirname, '../src/routes/authRoutes.js'),
  path.join(__dirname, '../src/routes/healthRoutes.js')
];

const doc = {
  info: {
    title: 'Auth Template API',
    description: 'API documentation for Auth Template Backend',
    version: '1.0.0',
    contact: {
      name: 'API Support',
      email: 'support@example.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:8000/api/v1',
      description: 'Development server'
    },
    {
      url: 'https://api.shikshadost.com/api/v1',
      description: 'Production server'
    }
  ],
  basePath: '/api/v1',
  schemes: ['http', 'https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  tags: [
    { name: 'Authentication', description: 'Authentication endpoints' },
    { name: 'Users', description: 'User operations' }
  ],
  securityDefinitions: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT'
    },
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'jwt'
    }
  },
  definitions: {
    // User Model
    User: {
      type: 'object',
      properties: {
        _id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        password: { type: 'string', example: 'hashedpassword123' },
        photo: { type: 'string', example: 'default.jpg' },
        role: { type: 'string', example: 'user', enum: ['user', 'admin'] },
        isVerified: { type: 'boolean', example: true },
        isActive: { type: 'boolean', example: true },
        passwordChangedAt: { type: 'string', format: 'date-time' },
        passwordResetToken: { type: 'string' },
        passwordResetExpires: { type: 'string', format: 'date-time' },
        emailVerificationToken: { type: 'string' },
        emailVerificationExpires: { type: 'string', format: 'date-time' },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2023-01-01T00:00:00.000Z'
        },
        updatedAt: { type: 'string', format: 'date-time' }
      },
      required: ['name', 'email', 'password']
    }
  }
};

swaggerAutogen()(outputFile, endpointsFiles, doc);

// // Generate swagger.json
// const generateSwagger = async () => {
//   try {
//     await swaggerAutogen()(outputFile, endpointsFiles, doc);
//     console.log("Swagger documentation generated successfully");
//   } catch (error) {
//     console.error("Error generating Swagger documentation:", error);
//   }
// };

// export default generateSwagger;
