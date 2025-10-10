# 🏗️ Architecture Documentation

## Table of Contents

- [Overview](#overview)
- [Architectural Principles](#architectural-principles)
- [System Architecture](#system-architecture)
- [Feature-Based Layered Architecture](#feature-based-layered-architecture)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)
- [Data Flow](#data-flow)
- [Security Architecture](#security-architecture)
- [Scalability & Performance](#scalability--performance)
- [Integration Architecture](#integration-architecture)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

This is a **production-grade authentication and monolith service** built with modern Node.js practices. The application follows a **feature-based modular architecture** combined with **layered architectural patterns** to ensure scalability, maintainability, and clear separation of concerns.

### Key Characteristics

- **Monolithic Architecture** with modular features
- **Feature-First Organization** with domain-driven design
- **Layered Architecture** within each feature
- **Repository Pattern** for data access
- **Service-Oriented Business Logic**
- **Event-Driven Communication** using RabbitMQ and Kafka
- **Microservices-Ready** structure for future decomposition

---

## Architectural Principles

### 1. **Separation of Concerns (SoC)**

Each layer and feature module has a single, well-defined responsibility.

### 2. **DRY (Don't Repeat Yourself)**

Shared utilities, helpers, and middleware are centralized and reusable across features.

### 3. **SOLID Principles**

- **Single Responsibility**: Each module/class/function does one thing well
- **Open/Closed**: Features are open for extension but closed for modification
- **Dependency Inversion**: High-level modules don't depend on low-level modules

### 4. **Domain-Driven Design (DDD)**

Features are organized around business domains (auth, payments, notifications, etc.)

### 5. **Fail-Fast Philosophy**

Input validation and error handling occur as early as possible in the request lifecycle.

### 6. **Security by Design**

Security considerations are built into every layer of the application.

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        API Gateway                          │
│                    (Nginx / Load Balancer)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────────┐
│                   Express Application                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Global Middleware Layer                   │  │
│  │  • Security Headers (Helmet)                         │  │
│  │  • CORS                                              │  │
│  │  • Rate Limiting                                     │  │
│  │  • Request Timeout                                   │  │
│  │  • Compression                                       │  │
│  │  • Body Parsing                                      │  │
│  │  • Cookie Parsing                                    │  │
│  │  • Sanitization (XSS, NoSQL Injection)              │  │
│  │  • Correlation ID                                    │  │
│  │  • Metrics Collection (Prometheus)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Feature Modules                         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │   Auth   │  │ Payments │  │  Search  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │  │
│  │  │  Notify  │  │  Storage │  │   Audit  │          │  │
│  │  └──────────┘  └──────────┘  └──────────┘          │  │
│  │                 ... and more ...                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Shared Services & Utilities                 │  │
│  │  • Logger (Winston + Loki)                           │  │
│  │  • Error Handler                                     │  │
│  │  • Response Formatter                                │  │
│  │  • Validation Helper                                 │  │
│  │  • General Helpers                                   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
      ┌──────────────────┼──────────────────┐
      │                  │                  │
      ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│ MongoDB  │      │  Redis   │      │OpenFGA   │
│ (Primary │      │ (Cache & │      │(AuthZ)   │
│   DB)    │      │ Session) │      │          │
└──────────┘      └──────────┘      └──────────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌──────────┐      ┌──────────┐      ┌──────────┐
│Elastic   │      │RabbitMQ/ │      │  AWS S3  │
│Search    │      │  Kafka   │      │(Storage) │
│          │      │(Events)  │      │          │
└──────────┘      └──────────┘      └──────────┘
```

---

## Feature-Based Layered Architecture

The application uses a **feature-based modular structure** where each feature contains its own layered architecture. This approach provides the best of both worlds: **modular features** (easy to understand and maintain) and **layered separation** (clear responsibilities).

### Project Structure

```
src/
├── connections/              # External service connections
│   ├── connectDB.js         # MongoDB connection
│   ├── connectRedis.js      # Redis connection
│   ├── connectOpenFGA.js    # OpenFGA client
│   ├── connectElasticSearch.js
│   ├── connectKafka.js
│   ├── connectRabbitMQ.js
│   └── connectNovu.js
│
├── config/                  # Configuration files
│   ├── dotenvConfig.js      # Environment configuration
│   └── searchConfig.js      # Search-specific config
│
├── features/                # 🎯 FEATURE MODULES (Domain-Driven)
│   │
│   ├── auth/                # Authentication Feature
│   │   ├── authRoutes.js           # [Layer 1: Routes] - API endpoint definitions
│   │   ├── authValidation.js       # [Layer 2: Validation] - Joi schemas
│   │   ├── authController.js       # [Layer 3: Controller] - Request/Response handling
│   │   ├── authMiddleware.js       # [Layer 3.5: Middleware] - Auth guards
│   │   ├── authService.js          # [Layer 4: Service] - Business logic
│   │   ├── authRepository.js       # [Layer 5: Repository] - Data access
│   │   ├── userModel.js            # [Layer 6: Model] - Mongoose schema
│   │   ├── refreshToken.js         # [Layer 6: Model] - Token schema
│   │   └── authConstants.js        # Constants and enums
│   │
│   ├── payments/            # Payment Processing Feature
│   │   ├── paymentsRoutes.js       # [Layer 1: Routes]
│   │   ├── paymentValidation.js    # [Layer 2: Validation]
│   │   ├── paymentController.js    # [Layer 3: Controller]
│   │   ├── paymentService.js       # [Layer 4: Service]
│   │   ├── paymentRepository.js    # [Layer 5: Repository]
│   │   ├── paymentModel.js         # [Layer 6: Model]
│   │   └── paymentConstants.js
│   │
│   ├── notifications/       # Notification System Feature
│   │   ├── notificationRoutes.js   # [Layer 1: Routes]
│   │   ├── notificationController.js # [Layer 3: Controller]
│   │   ├── notificationService.js  # [Layer 4: Service]
│   │   ├── notificationRepository.js # [Layer 5: Repository]
│   │   ├── notificationLogModel.js # [Layer 6: Model]
│   │   ├── notificationPreferencesModel.js
│   │   └── deviceModel.js
│   │
│   ├── search/              # Search & Analytics Feature
│   │   ├── searchRoutes.js
│   │   ├── searchController.js
│   │   ├── searchService.js
│   │   └── searchConstants.js
│   │
│   ├── permissions/         # Authorization Feature
│   │   ├── permissionsRoutes.js
│   │   ├── permissionsController.js
│   │   ├── permissionsService.js
│   │   └── permissionsRepository.js
│   │
│   ├── subscription/        # Subscription Management Feature
│   │   ├── subscriptionRoutes.js
│   │   ├── subscriptionController.js
│   │   ├── subscriptionService.js
│   │   ├── subscriptionRepository.js
│   │   └── subscriptionModel.js
│   │
│   ├── storage/             # File Storage Feature (S3)
│   │   ├── s3Routes.js
│   │   ├── s3Controller.js
│   │   └── s3Service.js
│   │
│   ├── audit/               # Audit Trail Feature
│   │   ├── auditRoutes.js
│   │   ├── auditController.js
│   │   ├── auditService.js
│   │   └── auditModel.js
│   │
│   ├── recommendations/     # Recommendations Feature (AWS Personalize)
│   │   ├── recommendationsRoutes.js
│   │   ├── recommendationsController.js
│   │   └── recommendationsService.js
│   │
│   ├── gemini/              # AI/ML Feature (Google Gemini)
│   │   ├── geminiRoutes.js
│   │   ├── geminiController.js
│   │   └── geminiService.js
│   │
│   └── health/              # Health Check Feature
│       ├── healthRoutes.js
│       └── healthController.js
│
├── helpers/                 # 🔧 Feature-Specific Helpers
│   ├── application.js       # Application-wide enums
│   ├── email.js            # Email utilities (Resend)
│   ├── gemini.js           # Gemini AI helpers
│   ├── generalHelper.js    # General utilities
│   ├── kafka.js            # Kafka helpers
│   ├── novu.js             # Novu notification helpers
│   └── cache/              # Redis caching utilities
│       └── redisFunctions.js
│
├── middlewares/             # 🛡️ Global Middleware
│   ├── globalErrorHandler.js  # Centralized error handling
│   └── serverMiddleware.js    # Security, CORS, rate limiting
│
├── utils/                   # 🛠️ General Utilities
│   ├── logger.js           # Winston logger
│   ├── httpError.js        # Error utility
│   ├── httpResponse.js     # Response formatter
│   ├── apiFeatures.js      # Pagination, filtering, sorting
│   └── quicker.js          # Performance utilities
│
├── examples/                # 📚 Integration Examples
│   ├── kafkaExamples.js
│   ├── openFGAExamples.js
│   ├── rabbitMQExample.js
│   └── redisAdvancedExamples.js
│
├── app.js                   # Express app configuration
└── index.js                 # Application entry point
```

### Layer Responsibilities Within Each Feature

#### **Layer 1: Routes** (`*Routes.js`)

- **Purpose**: Define API endpoints and HTTP methods
- **Responsibilities**:
  - Map URLs to controller functions
  - Apply feature-specific middleware
  - Define route-level validation
  - Document API with JSDoc for Swagger
- **Example**:

```javascript
// authRoutes.js
import express from 'express';
import * as authController from './authController.js';
import { authMiddleware } from './authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 */
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authMiddleware, authController.logout);

export default router;
```

#### **Layer 2: Validation** (`*Validation.js`)

- **Purpose**: Define input validation schemas
- **Responsibilities**:
  - Create Joi validation schemas
  - Validate request body, params, query
  - Sanitize and normalize input
- **Example**:

```javascript
// authValidation.js
import Joi from 'joi';

export const validateRegisterBody = Joi.object({
  name: Joi.string().trim().min(2).max(50).required(),
  emailAddress: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  phoneNumber: Joi.string().required(),
  consent: Joi.boolean().required()
});
```

#### **Layer 3: Controller** (`*Controller.js`)

- **Purpose**: Handle HTTP requests and responses (thin adapter layer)
- **Responsibilities**:
  - Extract data from request (body, params, query, headers)
  - Call validation functions
  - Delegate business logic to service layer
  - Format and send HTTP responses
  - Handle errors via httpError utility
- **Example**:

```javascript
// authController.js
import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import * as authService from './authService.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import { validateRegisterBody } from './authValidation.js';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateRegisterBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const newUser = await authService.registerUser(value);
  httpResponse(req, res, 201, 'SUCCESS', { _id: newUser._id });
});
```

#### **Layer 4: Service** (`*Service.js`)

- **Purpose**: Implement business logic and orchestration
- **Responsibilities**:
  - Core business logic and rules
  - Coordinate between multiple repositories
  - Integrate with external services
  - Handle complex workflows
  - Manage transactions
  - Implement caching strategies
- **Example**:

```javascript
// authService.js
import asyncHandler from 'express-async-handler';
import * as authRepository from './authRepository.js';
import { hashPassword, generateToken } from '../../helpers/generalHelper.js';
import { getHash, setHash } from '../../helpers/cache/redisFunctions.js';
import { Resendmail } from '../../helpers/email.js';

export const registerUser = asyncHandler(async (userData) => {
  // Check cache first
  const cachedUser = await getHash('user', `email:${userData.emailAddress}`);
  if (cachedUser) {
    throw new Error('User already exists');
  }

  // Business logic
  const encryptedPassword = await hashPassword(userData.password);
  const token = generateRandomId();

  // Data persistence
  const newUser = await authRepository.registerUser({
    ...userData,
    password: encryptedPassword,
    accountConfirmation: { token, status: false }
  });

  // External service integration
  await Resendmail({
    to: [userData.emailAddress],
    subject: 'Confirm Your Account',
    confirmationUrl: `${process.env.FRONTEND_URL}/confirm?token=${token}`
  });

  return newUser;
});
```

#### **Layer 5: Repository** (`*Repository.js`)

- **Purpose**: Abstract database operations (Data Access Layer)
- **Responsibilities**:
  - All database queries
  - CRUD operations
  - Complex queries with joins/aggregations
  - Database-specific optimizations
  - Query result transformation
- **Example**:

```javascript
// authRepository.js
import asyncHandler from 'express-async-handler';
import { User } from './userModel.js';

export const registerUser = asyncHandler(async (payload) => await User.create(payload));

export const findUserByEmailAddress = asyncHandler(
  async (emailAddress, select = '+password') => await User.findOne({ emailAddress }).select(select)
);

export const updateUserLastLogin = asyncHandler(
  async (userId) =>
    await User.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date() },
      { new: true, runValidators: true }
    )
);
```

#### **Layer 6: Model** (`*Model.js`)

- **Purpose**: Define data structure and constraints
- **Responsibilities**:
  - Mongoose schema definition
  - Field validation
  - Indexes for performance
  - Virtual properties
  - Instance/static methods
  - Pre/post hooks
- **Example**:

```javascript
// userModel.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    emailAddress: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true,
      select: false // Don't return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'moderator'],
      default: 'user'
    },
    accountConfirmation: {
      status: { type: Boolean, default: false },
      token: String,
      code: String,
      timestamp: Date
    },
    lastLoginAt: Date
  },
  {
    timestamps: true // Adds createdAt and updatedAt
  }
);

// Indexes for performance
userSchema.index({ emailAddress: 1 });
userSchema.index({ 'accountConfirmation.token': 1 });

export const User = mongoose.model('User', userSchema);
```

---

## Design Patterns

### 1. **Repository Pattern**

**Purpose**: Separate data access logic from business logic

**Implementation**:

- Each feature has a repository layer (`*Repository.js`)
- Repositories handle all database operations
- Services call repositories, never directly accessing the database

**Benefits**:

- Easy to test (mock repositories)
- Easy to switch databases
- Clear separation of concerns

### 2. **Service Layer Pattern**

**Purpose**: Encapsulate business logic

**Implementation**:

- Each feature has a service layer (`*Service.js`)
- Services orchestrate business workflows
- Controllers are thin and only handle HTTP concerns

**Benefits**:

- Business logic is reusable
- Easy to test business rules
- Controllers remain simple

### 3. **Singleton Pattern**

**Purpose**: Ensure single instance of resources

**Used For**:

- Database connections (MongoDB, Redis)
- External service clients (OpenFGA, Elasticsearch)
- Logger instance

**Example**:

```javascript
// connectRedis.js
import Redis from 'ioredis';

let redisClient;

export const connectRedis = async () => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    });
  }
  return redisClient;
};

export { redisClient };
```

### 4. **Middleware Pattern**

**Purpose**: Handle cross-cutting concerns

**Types**:

- **Global Middleware**: Applied to all routes (security, logging)
- **Feature Middleware**: Applied to specific feature routes (auth guards)
- **Route Middleware**: Applied to individual routes (validation)

**Example**:

```javascript
// authMiddleware.js
export const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return httpError(next, new Error('Unauthorized'), req, 401);
  }

  const decoded = verifyToken(token, process.env.ACCESS_TOKEN_SECRET);
  req.user = await authRepository.findUserById(decoded.userId);

  next();
});
```

### 5. **Factory Pattern**

**Purpose**: Create objects without specifying exact class

**Used For**:

- Error creation (`httpError` utility)
- Response formatting (`httpResponse` utility)
- Logger creation

**Example**:

```javascript
// httpError.js
export const httpError = (next, error, req, statusCode) => {
  const err = new Error(error.message || 'Internal Server Error');
  err.statusCode = statusCode || 500;
  err.correlationId = req.correlationId;
  err.path = req.originalUrl;
  next(err);
};
```

### 6. **Dependency Injection Pattern**

**Purpose**: Inject dependencies instead of hardcoding them

**Implementation**:

- Services receive dependencies as parameters
- Easy to mock for testing
- Loose coupling between modules

---

## Technology Stack

### Core Technologies

| Layer         | Technology           | Purpose                      |
| ------------- | -------------------- | ---------------------------- |
| **Runtime**   | Node.js 22.14+       | JavaScript runtime           |
| **Framework** | Express.js           | Web framework                |
| **Language**  | JavaScript (ES2020+) | Programming language         |
| **Database**  | MongoDB 7.0+         | Primary database             |
| **Cache**     | Redis 7.0+           | Caching & session storage    |
| **Search**    | Elasticsearch 8.0+   | Full-text search & analytics |

### Key Dependencies

| Category           | Libraries                        | Purpose                               |
| ------------------ | -------------------------------- | ------------------------------------- |
| **Authentication** | jsonwebtoken, bcryptjs           | JWT tokens, password hashing          |
| **Validation**     | Joi                              | Schema validation                     |
| **Security**       | helmet, cors, express-rate-limit | Security headers, CORS, rate limiting |
| **Logging**        | winston, winston-loki            | Structured logging                    |
| **Monitoring**     | prom-client                      | Prometheus metrics                    |
| **Messaging**      | amqplib, kafkajs                 | RabbitMQ & Kafka integration          |
| **Notifications**  | @novu/node                       | Multi-channel notifications           |
| **Payments**       | razorpay                         | Payment processing                    |
| **Storage**        | @aws-sdk/client-s3               | AWS S3 file storage                   |
| **Authorization**  | @openfga/sdk                     | Fine-grained permissions              |
| **AI**             | @google/genai                    | Google Gemini AI                      |
| **Email**          | resend                           | Transactional emails                  |

---

## Data Flow

### Request/Response Flow

```
1. Client Request
      ↓
2. Nginx / Load Balancer
      ↓
3. Express Server
      ↓
4. Global Middleware
   - Security Headers
   - CORS
   - Rate Limiting
   - Body Parsing
   - Sanitization
      ↓
5. Route Handler (Layer 1)
      ↓
6. Validation (Layer 2)
   - Joi Schema Validation
      ↓
7. Controller (Layer 3)
   - Extract request data
      ↓
8. Service (Layer 4)
   - Business Logic
   - Cache Check (Redis)
   - External Service Calls
      ↓
9. Repository (Layer 5)
   - Database Operations
      ↓
10. Model (Layer 6)
    - Mongoose Schema
    - MongoDB
      ↓
11. Response Flow
    Repository → Service → Controller
      ↓
12. Response Formatter
    - httpResponse utility
      ↓
13. Client Response
```

### Authentication Flow

```
┌────────────┐
│   Client   │
└──────┬─────┘
       │ POST /api/v1/auth/register
       ↓
┌────────────────────┐
│   authController   │
└──────┬─────────────┘
       │ validateRegisterBody
       ↓
┌────────────────────┐
│    authService     │
└──────┬─────────────┘
       │
       ├─→ Check Redis Cache
       │
       ├─→ authRepository.findUserByEmailAddress()
       │
       ├─→ hashPassword()
       │
       ├─→ authRepository.registerUser()
       │
       ├─→ Resendmail (Confirmation Email)
       │
       └─→ Return newUser
```

### Payment Flow

```
Client
  │
  ├─→ POST /api/v1/payments/create-order
  │     │
  │     └─→ paymentController
  │           │
  │           └─→ paymentService
  │                 │
  │                 ├─→ Razorpay API (Create Order)
  │                 │
  │                 └─→ paymentRepository.createPayment()
  │
  ├─→ POST /api/v1/payments/verify
  │     │
  │     └─→ paymentController
  │           │
  │           └─→ paymentService
  │                 │
  │                 ├─→ Razorpay API (Verify Signature)
  │                 │
  │                 ├─→ paymentRepository.updatePayment()
  │                 │
  │                 └─→ RabbitMQ (Publish 'payment.completed' event)
```

---

## Security Architecture

### Security Layers

```
┌─────────────────────────────────────────────────┐
│            1. Network Security                  │
│  • Nginx with SSL/TLS                          │
│  • Rate Limiting at API Gateway                │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         2. Application Security                 │
│  • Helmet (Security Headers)                   │
│  • CORS Configuration                          │
│  • Rate Limiting (express-rate-limit)          │
│  • Request Timeout                             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│          3. Input Validation                    │
│  • Joi Schema Validation                       │
│  • MongoDB Sanitization (express-mongo-sanitize)│
│  • XSS Protection                              │
│  • HPP (HTTP Parameter Pollution)              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│        4. Authentication Layer                  │
│  • JWT (Access & Refresh Tokens)               │
│  • Bcrypt Password Hashing                     │
│  • HTTP-Only Cookies                           │
│  • Token Rotation                              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         5. Authorization Layer                  │
│  • OpenFGA (Fine-Grained Permissions)          │
│  • Role-Based Access Control                   │
│  • Attribute-Based Access Control              │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│          6. Data Security                       │
│  • Encryption at Rest (MongoDB)                │
│  • Encryption in Transit (TLS)                 │
│  • Redis Password Protection                   │
│  • AWS S3 Encryption                           │
└─────────────────────────────────────────────────┘
```

### Authentication & Authorization

- **JWT Tokens**: Access tokens (1 hour) and refresh tokens (7 days)
- **Token Storage**: HTTP-only cookies with secure flag
- **Password Security**: Bcrypt with 12 rounds
- **OpenFGA Integration**: Relationship-based access control
- **Session Management**: Redis-based session storage

---

## Scalability & Performance

### Caching Strategy

```
┌──────────────────────────────────────────┐
│           Redis Cache Layers             │
├──────────────────────────────────────────┤
│  1. String Cache                         │
│     • JWT Tokens                         │
│     • Simple Objects (as JSON)           │
│                                          │
│  2. Hash Cache                           │
│     • User Profiles (id:*, email:*)      │
│     • Multi-field Objects                │
│                                          │
│  3. List Cache                           │
│     • Recent Notifications               │
│     • Activity Feeds                     │
│                                          │
│  4. Set Cache                            │
│     • Online Users                       │
│     • User Permissions                   │
│                                          │
│  5. Sorted Set Cache                     │
│     • Leaderboards                       │
│     • Trending Items                     │
└──────────────────────────────────────────┘
```

### Performance Optimizations

1. **Database Optimization**

   - Mongoose indexes on frequently queried fields
   - `.lean()` for read-only queries
   - `.select()` to limit returned fields
   - Connection pooling

2. **Caching Strategy**

   - Redis cache with appropriate TTL
   - Cache-aside pattern
   - Cache invalidation on updates

3. **Response Optimization**

   - Compression middleware
   - Response pagination
   - Field filtering

4. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Winston logging with Loki

---

## Integration Architecture

### External Service Integrations

```
Application Core
      ↓
┌─────────────────────────────────────────────┐
│        External Service Layer               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Novu    │  │ Razorpay │  │ OpenFGA  │   │
│  │ (Notify) │  │(Payments)│  │ (AuthZ)  │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │   AWS    │  │  Resend  │  │  Gemini  │   │
│  │   S3     │  │ (Email)  │  │  (AI)    │   │
│  └──────────┘  └──────────┘  └──────────┘   │
│                                             │
│  ┌──────────┐  ┌──────────┐                 │
│  │ RabbitMQ │  │  Kafka   │                 │
│  │ (Events) │  │ (Events) │                 │
│  └──────────┘  └──────────┘                 │
└─────────────────────────────────────────────┘
```

### Event-Driven Architecture

```
┌────────────────┐
│   Publisher    │
│   (Service)    │
└───────┬────────┘
        │ Publish Event
        ↓
┌────────────────┐
│  RabbitMQ /    │
│  Kafka Broker  │
└───────┬────────┘
        │ Event Distribution
        ↓
┌────────────────┐
│   Consumer     │
│   (Service)    │
└────────────────┘
```

**Use Cases**:

- Payment confirmation → Email notification
- User registration → Welcome email
- Subscription renewal → Billing service
- Audit trail logging → Audit service

---

## Deployment Architecture

### Docker Containerization

```yaml
# Production Stack
services:
  - app (Node.js)
  - mongodb
  - redis
  - elasticsearch
  - rabbitmq
  - openfga
  - grafana
  - prometheus
  - loki
```

### Environment Configuration

- **Development**: `.env.development`
- **Production**: `.env.production`
- **Docker Compose**: `docker-compose.yml`

### Build Pipeline

```
1. Code Commit
   ↓
2. Linting & Formatting
   - ESLint
   - Prettier
   ↓
3. Testing
   - Unit Tests
   - Integration Tests
   ↓
4. Build
   - Webpack Bundle
   - Minification
   ↓
5. Docker Build
   - prod.Dockerfile
   ↓
6. Deploy
   - Container Registry
   - Deployment to Production
```

---

## Feature-Based Layered Architecture Benefits

### ✅ **Advantages**

1. **Domain-Driven Organization**

   - Features map to business domains
   - Easy to understand for business stakeholders
   - Clear ownership of features

2. **Scalability**

   - Features can be extracted into microservices
   - Independent scaling of features
   - Parallel development by teams

3. **Maintainability**

   - All related code in one place
   - Easy to locate and modify feature code
   - Reduced cognitive load

4. **Testability**

   - Features can be tested independently
   - Clear boundaries for unit/integration tests
   - Mock dependencies easily

5. **Reusability**

   - Shared utilities in helpers/utils
   - Reusable patterns across features
   - Consistent architecture

6. **Microservices-Ready**
   - Each feature is a potential microservice
   - Clear boundaries between features
   - Easy to decompose monolith

### 📊 **When to Use This Architecture**

✅ **Good For**:

- Monoliths with plans to scale
- Medium to large teams
- Domain-driven design
- Long-term maintainability
- Gradual microservices migration

❌ **Not Ideal For**:

- Very small projects (< 3 features)
- Prototypes or MVPs
- Single-developer projects
- Extremely simple CRUD applications

---

## Future Enhancements

### Potential Architectural Evolution

1. **Microservices Migration**

   - Extract auth feature → Auth Microservice
   - Extract payments feature → Payments Microservice
   - API Gateway (Kong/Nginx)

2. **Event Sourcing**

   - Event store for audit trail
   - CQRS pattern implementation

3. **GraphQL API**

   - GraphQL layer on top of REST
   - Schema stitching for features

4. **Service Mesh**
   - Istio/Linkerd integration
   - Advanced traffic management

---

## Best Practices

### Code Organization

1. ✅ **One feature, one directory**
2. ✅ **Follow the layered pattern within features**
3. ✅ **Keep controllers thin (< 50 lines)**
4. ✅ **Business logic belongs in services**
5. ✅ **Database queries belong in repositories**
6. ✅ **Validation schemas in separate files**
7. ✅ **Constants in dedicated files**

### Naming Conventions

- **Files**: `camelCase.js`
- **Functions**: `camelCase()`
- **Constants**: `UPPER_SNAKE_CASE`
- **Models**: `PascalCase`
- **Routes**: `kebab-case` URLs

### Error Handling

- Use `httpError` utility consistently
- Wrap async functions with `asyncHandler`
- Centralized error handling in `globalErrorHandler`
- Meaningful error messages with context

### Testing Strategy

- **Unit Tests**: Services and utilities
- **Integration Tests**: API endpoints
- **E2E Tests**: Critical user flows
- **Performance Tests**: Load testing

---

## Conclusion

This architecture combines the best of **monolithic simplicity** with **microservices modularity**. The feature-based layered approach provides:

- **Clear separation of concerns**
- **Easy maintenance and scalability**
- **Domain-driven organization**
- **Microservices-ready structure**
- **Production-grade quality**

The architecture is designed to **grow with your application**, from a monolith to distributed microservices when needed.

---

**Document Version**: 1.0  
**Last Updated**: 2025-10-04  
**Maintained By**: Harmeet Singh
