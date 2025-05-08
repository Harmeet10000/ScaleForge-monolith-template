# 🔐 Production-Grade Authentication Template

<div align="center">
  <!-- Core Technologies -->
  <img src="https://img.shields.io/badge/node.js-22.14.0-brightgreen" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/express-4.21.2-blue" alt="Express Version" />
  <img src="https://img.shields.io/badge/mongoose-8.10.1-green" alt="MongoDB" />
  <img src="https://img.shields.io/badge/ioredis-5.6.1-red" alt="Redis" />
  <br/>
  <img src="https://img.shields.io/badge/docker-ready-blue" alt="Docker Ready" />
  <img src="https://img.shields.io/badge/license-ISC-lightgrey" alt="License" />
</div>

<div align="center">
  <h3>Key Dependencies</h3>
  <img src="https://img.shields.io/badge/typescript-types-blue" alt="TypeScript" />
  <img src="https://img.shields.io/badge/winston-3.17.0-orange" alt="Winston" />
  <img src="https://img.shields.io/badge/joi-17.13.3-yellow" alt="Joi" />
  <br/>
  <img src="https://img.shields.io/badge/swagger--ui--express-5.0.1-green" alt="Swagger UI" />
  <img src="https://img.shields.io-badge/helmet-8.0.0-lightgrey" alt="Helmet" />
  <img src="https://img.shields.io/badge/cors-2.8.5-orange" alt="CORS" />
  <br/>
  <img src="https://img.shields.io/badge/amqplib-0.10.7-purple" alt="RabbitMQ" />
  <img src="https://img.shields.io/badge/aws--sdk-3.797.0-yellow" alt="AWS SDK" />
  <img src="https://img.shields.io/badge/jsonwebtoken-9.0.2-blue" alt="JWT" />
  <br/>
  <img src="https://img.shields.io/badge/compression-1.8.0-lightgrey" alt="Compression" />
  <img src="https://img.shields.io/badge/prom--client-15.1.3-orange" alt="Prometheus" />
</div>

<div align="center">
  <h3>Development Tools</h3>
  <img src="https://img.shields.io/badge/eslint-9.24.0-purple" alt="ESLint" />
  <img src="https://img.shields.io/badge/prettier-3.5.2-pink" alt="Prettier" />
  <img src="https://img.shields.io/badge/husky-9.1.7-brown" alt="Husky" />
  <br/>
  <img src="https://img.shields.io/badge/nodemon-3.1.9-green" alt="Nodemon" />
  <img src="https://img.shields.io/badge/webpack--cli-6.0.1-blue" alt="Webpack" />
  <img src="https://img.shields.io/badge/commitlint-19.7.1-orange" alt="Commitlint" />
</div>

<p align="center">A robust, secure, and scalable authentication service template built with Node.js, Express, MongoDB, and Redis.</p>

<details open>
<summary>📑 Table of Contents</summary>

- [✨ Features](#-features)
- [📋 Prerequisites](#-prerequisites)
- [🚀 Getting Started](#-getting-started)
- [📊 Project Structure](#-project-structure)
- [⚙️ Configuration](#️-configuration)
- [🛠️ Available Scripts](#️-available-scripts)
- [🔒 Security Features](#-security-features)
- [🧪 Testing](#-testing)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

</details>

## ✨ Features

<details open>
<summary><b>🔑 Complete Authentication System</b></summary>
<br/>

- ✅ User registration with email verification
- ✅ Login with JWT (access and refresh tokens)
- ✅ Secure password reset flow
- ✅ Account confirmation mechanism
- ✅ Session management with Redis
- ✅ Secure password handling with bcrypt
- ✅ Refresh token rotation

</details>

<details open>
<summary><b>🛡️ Security First Approach</b></summary>
<br/>

- ✅ CORS protection with configurable origins
- ✅ Helmet security headers
- ✅ Intelligent rate limiting
- ✅ MongoDB sanitization against NoSQL injection
- ✅ XSS protection with input sanitization
- ✅ Secure HTTP-only cookies
- ✅ Comprehensive input validation with Joi
- ✅ Content security policies

</details>

<details open>
<summary><b>🏭 Production Ready</b></summary>
<br/>

- ✅ Dockerized deployment with separate dev/prod configs
- ✅ Webpack bundling for optimized builds
- ✅ Environment-specific configurations
- ✅ Comprehensive error handling
- ✅ API documentation with Swagger
- ✅ Structured logging system
- ✅ Health check endpoints
- ✅ Database backup to S3
- ✅ Response compression
- ✅ RabbitMQ integration for microservice communication

</details>

<details open>
<summary><b>👨‍💻 Developer Experience</b></summary>
<br/>

- ✅ Hot reloading in development
- ✅ Code linting and formatting with ESLint and Prettier
- ✅ Git hooks with Husky
- ✅ Comprehensive test suite
- ✅ Conventional commit messages
- ✅ Clear project structure
- ✅ Utility scripts for common tasks

</details>

## 📋 Prerequisites

<table>
  <tr>
    <td>Node.js</td>
    <td>≥ 22.14.0</td>
  </tr>
  <tr>
    <td>npm</td>
    <td>≥ 10.7.0</td>
  </tr>
  <tr>
    <td>MongoDB</td>
    <td>Latest</td>
  </tr>
  <tr>
    <td>Redis</td>
    <td>Latest</td>
  </tr>
  <tr>
    <td>Docker</td>
    <td>Optional for containerized deployment</td>
  </tr>
</table>

## 🚀 Getting Started

<details open>
<summary><b>⬇️ Installation</b></summary>
<br/>

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

# Backup Configuration
S3_BACKUP_ENABLED=true
S3_BUCKET_NAME=your-backup-bucket
AWS_REGION=us-east-1
S3_PREFIX=mongodb-backups/
```

</details>

<details>
<summary><b>▶️ Running the Application</b></summary>
<br/>

#### Development Mode

```bash
npm run dev
```

#### Production Build

```bash
npm run build
npm start
```

</details>

<details>
<summary><b>🐳 Docker Deployment</b></summary>
<br/>

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

</details>

<details>
<summary><b>📝 API Documentation</b></summary>
<br/>

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

</details>

## 📊 Project Structure

<details open>
<summary><b>🗂️ Folder Organization</b></summary>

```
backend/
├── docker/                # Docker configuration files
│   ├── dev/               # Development Docker setup
│   └── prod/              # Production Docker setup
├── docs/                  # API documentation
│   ├── swagger-output.json
│   └── swagger.js
├── logs/                  # Application logs
├── nginx/                 # Nginx configuration for deployment
│   ├── http.conf
│   └── https.conf
├── scripts/               # Utility scripts
│   ├── cron.sh
│   ├── dbBackup.js
│   └── docker.sh
├── src/                   # Source code
│   ├── config/            # Configuration files
│   ├── constant/          # Constants and enums
│   ├── controllers/       # Request handlers
│   ├── db/                # Database connection modules
│   ├── helpers/           # Helper utilities
│   ├── middlewares/       # Express middlewares
│   ├── models/            # Mongoose models
│   ├── repository/        # Data access layer
│   ├── routes/            # API routes
│   ├── services/          # Business logic layer
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions
│   ├── validations/       # Input validation schemas
│   ├── app.js             # Express application setup
│   └── index.js           # Application entry point
└── test/                  # Test files
    ├── mockData/          # Mock data for tests
    ├── routes/            # API route tests
    ├── utils/             # Test utilities
    └── validations/       # Validation tests
```

</details>

## ⚙️ Configuration

<details>
<summary><b>📄 Configuration Files</b></summary>
<br/>

- **webpack.config.js**: Configures bundling for production deployment
- **eslint.config.js**: JavaScript linting rules
- **commitlint.config.js**: Conventional commit message validation
- **test-runner.js**: Test runner configuration
- **prometheus.yml**: Prometheus monitoring configuration

</details>

## 🛠️ Available Scripts

<details open>
<summary><b>📋 NPM Commands</b></summary>
<br/>

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

</details>

## 🔒 Security Features

<details open>
<summary><b>🔐 Security Implementation</b></summary>
<br/>

- **JWT Authentication**: Secure token-based authentication with refresh token rotation
- **Password Security**: Bcrypt hashing with appropriate salt rounds
- **Rate Limiting**: Protection against brute force attacks
- **Data Validation**: Joi schemas for request validation
- **HTTP Security Headers**: Using Helmet middleware
- **Cookie Security**: HTTP-only, secure cookies with proper domain and path settings
- **MongoDB Sanitization**: Protection against NoSQL injection
- **XSS Protection**: Sanitization of user input

</details>

## 🧪 Testing

<details>
<summary><b>🧠 Test Commands</b></summary>
<br/>

Run all tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate test coverage report:

```bash
npm run test:coverage
```

</details>

## 🔄 API Endpoints

<details>
<summary><b>🔑 Authentication Routes</b></summary>
<br/>

- `POST /api/v1/auth/register` - Register new user
- `PUT /api/v1/auth/confirmation/:token` - Confirm user account
- `POST /api/v1/auth/login` - Login user
- `PUT /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Generate new access token
- `PUT /api/v1/auth/forgot-password` - Request password reset
- `PUT /api/v1/auth/reset-password/:token` - Reset password
- `PUT /api/v1/auth/change-password` - Change password (authenticated)

</details>

<details>
<summary><b>🩺 Health Routes</b></summary>
<br/>

- `GET /api/v1/health` - Check API health
- `GET /api/v1/health/db` - Check database connection
- `GET /api/v1/health/redis` - Check Redis connection

</details>

## 🤝 Contributing

<details>
<summary><b>📜 Contribution Guidelines</b></summary>
<br/>

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

</details>

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

<div align="center">

### ⭐ Star this repository if you find it useful! ⭐

Created with ❤️ by [Harmeet Singh](https://github.com/yourusername)

<a href="#top">⬆️ Back to top ⬆️</a>

</div>
