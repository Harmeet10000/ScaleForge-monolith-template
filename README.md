# Production-Grade Authentication Template

A robust, secure, and scalable authentication service template built with Node.js, Express, MongoDB, and Redis. This project follows industry best practices for security, performance, and code organization.

## 🌟 Features

- **Complete Authentication System**

  - User registration with email verification
  - Login with JWT (access and refresh tokens)
  - Password reset flow
  - Account confirmation
  - Session management with Redis
  - Secure password handling

- **Security First Approach**

  - CORS protection
  - Helmet security headers
  - Rate limiting
  - MongoDB sanitization
  - XSS protection
  - Secure HTTP-only cookies
  - Input validation

- **Production Ready**

  - Dockerized deployment
  - Webpack bundling
  - Environment-specific configurations
  - Comprehensive error handling
  - API documentation with Swagger
  - Logging system
  - Health check endpoints

- **Developer Experience**
  - Hot reloading in development
  - Code linting and formatting
  - Git hooks with Husky
  - Comprehensive test suite
  - Conventional commit messages
  - ESLint and Prettier integration

## 📋 Prerequisites

- Node.js >= 22.14.0
- npm >= 10.7.0
- MongoDB
- Redis
- Docker (optional for containerized deployment)

## 🚀 Getting Started

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/production-grade-auth-template.git
cd production-grade-auth-template/backend
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env.development` file in the root directory with the following variables:

```env
# Server
NODE_ENV=development
PORT=3000
SERVER_URL=http://localhost:3000

# Database
DATABASE_URL=mongodb://localhost:27017/auth-service
REDIS_URL=redis://localhost:6379

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRY=900
REFRESH_TOKEN_EXPIRY=604800

# Email
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your_email@example.com
EMAIL_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourservice.com

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Running the Application

#### Development Mode

```bash
npm run dev
```

#### Production Build

```bash
npm run build
npm start
```

### Docker Deployment

#### Development

```bash
docker build -t auth-service-dev -f docker/dev/Dockerfile .
docker run -p 3000:3000 --env-file .env.development auth-service-dev
```

#### Production

```bash
docker build -t auth-service-prod -f docker/prod/Dockerfile .
docker run -p 3000:3000 --env-file .env.production auth-service-prod
```

### API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## 📊 Database Migrations

```bash
# Run migrations in development environment
npm run migrate:dev

# Run migrations in production environment
npm run migrate:prod
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 📁 Project Structure

```
backend/
├── docker/              # Docker configuration files
│   ├── dev/             # Development Docker setup
│   └── prod/            # Production Docker setup
├── docs/                # API documentation
├── logs/                # Application logs
├── nginx/               # Nginx configuration for deployment
├── scripts/             # Utility scripts
├── src/                 # Source code
│   ├── config/          # Configuration files
│   ├── constant/        # Constants and enums
│   ├── controllers/     # Request handlers
│   ├── db/              # Database connection modules
│   ├── helpers/         # Helper utilities
│   ├── middlewares/     # Express middlewares
│   ├── models/          # Mongoose models
│   ├── repository/      # Data access layer
│   ├── routes/          # API routes
│   ├── services/        # Business logic layer
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── validations/     # Input validation schemas
│   ├── app.js           # Express application setup
│   └── index.js         # Application entry point
└── test/                # Test files
    ├── mockData/        # Mock data for tests
    ├── routes/          # API route tests
    ├── utils/           # Test utilities
    └── validations/     # Validation tests
```

## ⚙️ Configuration Files

- **webpack.config.js**: Configures bundling for production deployment
- **eslint.config.js**: JavaScript linting rules
- **commitlint.config.js**: Conventional commit message validation
- **test-runner.js**: Test runner configuration

## 🛠️ NPM Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server with hot reload |
| `npm run build`         | Build the production bundle                  |
| `npm run dev:prod`      | Run production build with nodemon            |
| `npm start`             | Start the production server                  |
| `npm run swagger`       | Generate Swagger documentation               |
| `npm test`              | Run the test suite                           |
| `npm run test:watch`    | Run tests in watch mode                      |
| `npm run test:coverage` | Run tests with coverage report               |
| `npm run lint`          | Check code for linting errors                |
| `npm run lint:fix`      | Fix linting errors automatically             |
| `npm run format`        | Check code formatting                        |
| `npm run format:fix`    | Fix formatting issues automatically          |
| `npm run migrate:dev`   | Run database migrations in development       |
| `npm run migrate:prod`  | Run database migrations in production        |

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication with refresh token rotation
- **Password Security**: Bcrypt hashing with appropriate salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Data Validation**: Joi schemas for request validation
- **HTTP Security Headers**: Using Helmet middleware
- **Cookie Security**: HTTP-only, secure cookies with proper domain and path settings
- **MongoDB Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Sanitization of user input

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 👤 Author

Harmeet Singh
