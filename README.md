# 🔐 Production-Grade Authentication Template

<div align="center">
  <img src="https://img.shields.io/badge/node.js-20.14.0-brightgreen" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/express-4.x-blue" alt="Express Version" />
  <img src="https://img.shields.io/badge/postgres-latest-blue" alt="Postgres" />
  <img src="https://img.shields.io/badge/redis-latest-red" alt="Redis" />
  <img src="https://img.shields.io/badge/rabbitmq-latest-orange" alt="RabbitMQ" />
  <br/>
  <img src="https://img.shields.io/badge/docker-ready-blue" alt="Docker Ready" />
  <img src="https://img.shields.io/badge/license-ISC-lightgrey" alt="License" />
</div>

<p align="center">A robust, secure, and scalable authentication service template built with Node.js, Express, Neon/Postgres, Redis, RabbitMQ, and more.</p>

---

## ✨ Features

- ✅ User registration with email verification
- ✅ Login with JWT (access and refresh tokens)
- ✅ Secure password reset flow
- ✅ Account confirmation mechanism
- ✅ Session management with Redis
- ✅ Secure password handling with bcrypt
- ✅ Refresh token rotation
- ✅ Graceful shutdowns for all services
- ✅ Response compression for responses above 15KB
- ✅ RabbitMQ for async jobs (e.g., sending emails)
- ✅ Prometheus and Grafana for monitoring
- ✅ Webpack for optimized production builds
- ✅ Factory handlers for DRY code (repository, service, controller layers)
- ✅ Database backups and cron jobs for refresh token cleanup
- ✅ Redis for caching
- ✅ Swagger documentation for API
- ✅ Razorpay integration for payments
- ✅ S3 for media storage
- ✅ Docker for development and deployment
- ✅ Resend for transactional emails
- ✅ MVC pattern: repository, services, models, routes, controllers

---

## 📋 Prerequisites

- Node.js >= 20.14.0
- npm >= 10.7.0
- Neon/Postgres
- Redis
- RabbitMQ
- Docker (optional, for containerized deployment)

---

## 🚀 Getting Started

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
DATABASE_URL=postgres://user:password@localhost:5432/auth_service
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
RESEND_API_KEY=your_resend_api_key

# Frontend
FRONTEND_URL=http://localhost:5173

# Backup Configuration
S3_BACKUP_ENABLED=true
S3_BUCKET_NAME=your-backup-bucket
AWS_REGION=us-east-1
S3_PREFIX=postgres-backups/

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

---

## 📊 Project Structure

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
├── scripts/               # Utility scripts & cron jobs
│   ├── cron-jobs/         # Cron jobs (e.g., cleanupExpiredRefreshTokens.js, dbBackup.js)
│   ├── migrate.ts         # DB migration script
│   └── docker.sh
├── src/                   # Source code
│   ├── config/            # Configuration files
│   ├── constant/          # Constants and enums
│   ├── controllers/       # Request handlers
│   ├── db/                # Database connection, models, migrations
│   │   ├── migrations/    # Drizzle migrations
│   │   ├── models/        # Drizzle models (userModel.ts, refreshToken.ts)
│   │   └── seeders/       # Seed scripts
│   ├── helpers/           # Helper utilities (email, rabbitMQ, redis, s3, etc.)
│   ├── middlewares/       # Express middlewares (auth, error handler, etc.)
│   ├── repository/        # Data access layer (factory pattern)
│   ├── routes/            # API routes
│   ├── services/          # Business logic layer (factory pattern)
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions (apiFeatures, logger, etc.)
│   ├── validations/       # Input validation schemas
│   ├── app.ts             # Express application setup
│   └── index.ts           # Application entry point
└── test/                  # Test files
    ├── mockData/          # Mock data for tests
    ├── routes/            # API route tests
    ├── utils/             # Test utilities
    └── validations/       # Validation tests
```

---

## 🛠️ Available Scripts

| Command                 | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the development server with hot reload |
| `npm run build`         | Build the production bundle (Webpack)        |
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
| `npm run db:generate`   | Generate Drizzle migrations                  |
| `npm run db:migrate`    | Run Drizzle migrations                       |

---

## 🔒 Security & Architecture Highlights

- **Graceful Shutdowns:** Ensures all services (HTTP, Redis, RabbitMQ, DB) close cleanly on exit.
- **Compression:** Only compresses responses above 15KB for optimal performance.
- **RabbitMQ:** Used for async job handling (e.g., sending emails, load distribution).
- **Prometheus & Grafana:** Integrated for real-time monitoring and alerting.
- **Webpack:** Used for bundling and optimizing production code.
- **Factory Handlers:** Repository, service, and controller factories to avoid code repetition.
- **Database Backups:** Automated scripts for regular DB backups (S3 supported).
- **Redis Caching:** For session and data caching, improving performance.
- **Swagger:** API documentation auto-generated and available at `/api-docs`.
- **Razorpay:** Payment gateway integration for handling payments.
- **Cron Jobs:** Automated cleanup of expired refresh tokens and other scheduled tasks.
- **S3 Storage:** For media and backup storage.
- **Docker:** Ensures consistent development and deployment environments.
- **Resend:** For reliable transactional email delivery.
- **MVC Pattern:** Clean separation of concerns with repository, service, model, route, and controller layers.

---

## 🧪 Testing

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

---

## 📝 API Documentation

Once the server is running, access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the ISC License - see the LICENSE file for details.

---

<div align="center">

### ⭐ Star this repository if you find it useful! ⭐

Created with ❤️ by [Harmeet Singh](https://github.com/yourusername)

<a href="#top">⬆️ Back to top ⬆️</a>

</div>
