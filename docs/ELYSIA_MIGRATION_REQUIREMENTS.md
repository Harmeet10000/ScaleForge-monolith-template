# Elysia.js Migration Requirements Document

## Executive Summary

This document outlines a comprehensive migration plan to convert the production-grade authentication service from **Express.js** to **Elysia.js**, a modern, type-safe, and high-performance TypeScript web framework. The project currently comprises 11 feature modules, complex middleware, multi-database integrations, and enterprise-level security patterns.

---

## 1. Project Overview

### Current Stack
- **Runtime**: Node.js (>=22.14.0)
- **Framework**: Express.js with 50+ middleware plugins
- **Databases**: MongoDB (Mongoose), PostgreSQL (Drizzle ORM)
- **Caching**: Redis (ioredis)
- **Message Queues**: RabbitMQ, Kafka
- **Search**: Elasticsearch
- **External Services**: Novu, OpenFGA, AWS S3, Google Gemini, Resend
- **Logging**: Winston + Loki
- **Testing**: Node test runner
- **Package Manager**: pnpm

### Current Architecture Pattern
- **Layered Architecture**: Controllers → Services → Repository → Models
- **Feature-First Organization**: Each feature is self-contained (auth, payments, notifications, etc.)
- **Middleware-Heavy**: 10+ middleware functions for security, logging, rate limiting, etc.
- **Error Handling**: Centralized global error handler with custom `httpError` utility
- **Response Format**: Standardized via `httpResponse` utility
- **Validation**: Joi schema-based validation

---

## 2. Target Architecture with Elysia.js

### Why Elysia.js?
1. **Type Safety**: Native TypeScript support (better than Express)
2. **Performance**: 2-3x faster than Express for JSON APIs
3. **Built-in Validation**: Native schema validation (Elysia schemas or integration with Zod/Ark)
4. **Hooks System**: Similar to middleware but more ergonomic
5. **Plugin Architecture**: Clean plugin system for features
6. **Better DX**: Auto-generated OpenAPI docs, type inference

### Core Framework Changes

#### 2.1 Server Initialization
**From**:
```javascript
// Express
const app = express();
app.use(middleware1);
app.use(middleware2);
app.listen(process.env.PORT);
```

**To**:
```typescript
// Elysia
const app = new Elysia()
  .use(middleware1)
  .use(middleware2)
  .listen(process.env.PORT);
```

---

## 3. Dependency Mapping & Replacements

### 3.1 Core Framework Dependencies

| Express Ecosystem | Elysia Equivalent | Action |
|---|---|---|
| `express` | `elysia` | **Replace** |
| `express-async-handler` | Elysia native error handling | **Remove** - not needed |
| `express-prom-bundle` | Custom integration or third-party | **Adapt** |
| `express-rate-limit` | Elysia plugins (e.g., `elysia-rate-limit`) | **Replace** |
| `express-timeout-handler` | Elysia timeout handlers | **Replace** |
| `swagger-ui-express` | Elysia OpenAPI/Swagger plugin | **Replace** |
| `swagger-jsdoc` | Elysia decorators | **Replace** |

### 3.2 Middleware & Security Dependencies

| Package | Purpose | Elysia Migration |
|---|---|---|
| `helmet` | Security headers | **Keep** (HTTP library agnostic) or use `elysia-helmet` |
| `cors` | CORS handling | **Replace** with `elysia-cors` |
| `compression` | Response compression | **Keep** (can wrap) or use `elysia-compress` |
| `cookie-parser` | Cookie parsing | Elysia has built-in cookie support |
| `express-mongo-sanitize` | NoSQL injection prevention | **Keep** (data sanitization) |
| `hpp` (HTTP Parameter Pollution) | Parameter pollution prevention | **Adapt** - write custom middleware |
| `express-timeout-handler` | Request timeout | **Replace** with Elysia timeout handler |
| `overload-protection` | Memory/event loop protection | **Keep** or replace with similar |

### 3.3 Database & ORM Dependencies

| Package | Status | Notes |
|---|---|---|
| `mongoose` | **Keep** | No breaking changes for Elysia |
| `drizzle-orm` | **Keep** | No breaking changes for Elysia |
| `ioredis` | **Keep** | No breaking changes for Elysia |
| `amqplib` (RabbitMQ) | **Keep** | No breaking changes for Elysia |
| `@elastic/elasticsearch` | **Keep** | No breaking changes for Elysia |
| `@neondatabase/serverless` | **Keep** | No breaking changes for Elysia |

### 3.4 Validation Dependencies

| Package | Elysia Approach | Action |
|---|---|---|
| `joi` | Migrate to Elysia schemas OR use `zod` + Elysia integrations | **Evaluate** |
| Manual Joi validation | Elysia built-in `t.Object()` schemas | **Replace** |

### 3.5 Utilities & Helpers

| Package | Status | Notes |
|---|---|---|
| `jsonwebtoken` | **Keep** | No breaking changes |
| `bcryptjs` | **Keep** | No breaking changes |
| `dayjs` | **Keep** | No breaking changes |
| `nanoid` | **Keep** | No breaking changes |
| `winston` | **Keep** | Logging framework agnostic |
| `winston-loki` | **Keep** | Logging framework agnostic |
| `@google/genai` | **Keep** | No breaking changes |
| `@novu/node` | **Keep** | No breaking changes |
| `resend` | **Keep** | No breaking changes |
| `razorpay` | **Keep** | No breaking changes |
| `@aws-sdk/*` | **Keep** | No breaking changes |

### 3.6 Development Dependencies

| Package | Elysia Approach | Action |
|---|---|---|
| `nodemon` | **Keep** | Works with Elysia |
| `eslint` | **Keep** | Configure for TypeScript |
| `prettier` | **Keep** | Works with TypeScript |
| `husky` | **Keep** | Works with all frameworks |
| `webpack` | **Keep** or replace with Elysia's bundler | **Evaluate** |
| `babel-*` | **Remove** (use TypeScript directly) | **Replace** |
| `ts-node` | **Keep** for dev (optional) | Dev dependency |

### 3.7 New Dependencies for Elysia

```json
{
  "dependencies": {
    "elysia": "^latest",
    "elysia-cors": "^latest",
    "@elysiajs/bearer": "^latest",
    "@elysiajs/cookie": "^latest",
    "@elysiajs/swagger": "^latest",
    "@elysiajs/compress": "^latest",
    "zod": "^latest",
    "@elysiajs/trpc": "^optional",
    "elysia-rate-limit": "^latest"
  },
  "devDependencies": {
    "typescript": "^5.0+",
    "@types/node": "^latest",
    "bun": "^latest"
  }
}
```

---

## 4. Code Migration Guide

### 4.1 Middleware → Hooks Pattern

**Express Middleware** (Global + Route-specific):
```javascript
app.use(errorHandlingMiddleware);
app.use('/api', rateLimitMiddleware);
router.get('/protected', authMiddleware, controller);
```

**Elysia Hooks**:
```typescript
const app = new Elysia()
  .onError(errorHandlingHook)
  .guard({ 
    async beforeHandle({ request }) {
      // Rate limiting logic
    }
  })
  .get('/protected', controller, {
    beforeHandle: [authHook]
  });
```

### 4.2 Route Organization

**Current Express Pattern**:
```javascript
// Each feature has authRoutes.js
const router = express.Router();
router.post('/register', register);
router.post('/login', login);
export default router;

// Mount in app.js
app.use('/api/v1/auth', authRoutes);
```

**Elysia Pattern** - Two Approaches:

**Option A: Feature Plugins**
```typescript
const authPlugin = new Elysia({ prefix: '/api/v1/auth' })
  .post('/register', register)
  .post('/login', login);

const app = new Elysia()
  .use(authPlugin)
  .use(paymentsPlugin)
  .use(notificationsPlugin);
```

**Option B: Service-based (Recommended for large apps)**
```typescript
// authService.ts - contains routes
export const authService = new Elysia({ prefix: '/api/v1/auth' })
  .post('/register', register)
  .post('/login', login);

// app.ts
import { authService } from './features/auth/authService';
const app = new Elysia()
  .use(authService);
```

### 4.3 Controllers (Minimal Changes)

**Current Express**:
```javascript
export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateLoginBody, req.body);
  if (error) return httpError(next, error, req, 422);
  
  const { accessToken, refreshToken, userForResponse } = 
    await authService.loginUser(value, req, next);
  
  httpResponse(req, res, 200, SUCCESS, { accessToken, refreshToken });
});
```

**Elysia Controller**:
```typescript
export const login = async ({ body, set }: Context) => {
  // Validation handled by Elysia schema (see section 4.6)
  const { accessToken, refreshToken, userForResponse } = 
    await authService.loginUser(body);
  
  set.status = 200;
  set.headers['Set-Cookie'] = [
    `accessToken=${accessToken}; ...`,
    `refreshToken=${refreshToken}; ...`
  ];
  
  return {
    success: true,
    message: SUCCESS,
    data: { accessToken, refreshToken, user: userForResponse }
  };
};
```

### 4.4 Error Handling

**Current Global Error Handler** (Centralized in middleware):
```javascript
export const globalErrorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    sendErrorProd(err, res);
  }
};
```

**Elysia Error Handler**:
```typescript
const errorHandler = (err: Error, req: Context) => {
  const statusCode = err.statusCode || 500;
  const isDev = process.env.NODE_ENV === 'development';
  
  return {
    success: false,
    statusCode,
    message: err.message,
    ...(isDev && { stack: err.stack })
  };
};

const app = new Elysia()
  .onError(({ error, set }) => {
    set.status = error.statusCode || 500;
    return errorHandler(error, null);
  });
```

### 4.5 Authentication Middleware

**Current Express**:
```javascript
export const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt || req.headers.authorization?.split(' ')[1];
  const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);
  req.user = await User.findById(decoded.userId);
  next();
});
```

**Elysia with Bearer Plugin**:
```typescript
import { bearer } from '@elysiajs/bearer';

const authPlugin = new Elysia()
  .use(bearer())
  .guard({
    async beforeHandle({ headers, cookie, set }) {
      const token = headers.authorization?.split(' ')[1] || cookie.jwt?.value;
      const decoded = await verifyToken(token);
      const user = await User.findById(decoded.userId);
      return { user };
    }
  });
```

### 4.6 Request Body Validation

**Current Joi Approach**:
```javascript
const validateLoginBody = Joi.object({
  emailAddress: Joi.string().email().trim().required(),
  password: Joi.string().min(8).max(24).trim().required()
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateLoginBody, req.body);
  if (error) return httpError(next, error, req, 422);
  // use value
});
```

**Elysia Native Validation** (Option 1 - Recommended):
```typescript
export const login = new Elysia()
  .post('/login', ({ body }) => {
    // body is validated and typed
    return { accessToken, refreshToken };
  }, {
    body: t.Object({
      emailAddress: t.String({ format: 'email' }),
      password: t.String({ minLength: 8, maxLength: 24 })
    }),
    response: t.Object({
      accessToken: t.String(),
      refreshToken: t.String()
    })
  });
```

**Elysia + Zod** (Option 2 - If migrating from Joi):
```typescript
import { z } from 'zod';

const loginSchema = z.object({
  emailAddress: z.string().email(),
  password: z.string().min(8).max(24)
});

export const login = new Elysia()
  .post('/login', async ({ body }) => {
    const validated = await loginSchema.parseAsync(body);
    // use validated
  });
```

### 4.7 Cookies & Set-Cookie Headers

**Current Express**:
```javascript
res
  .cookie('accessToken', accessToken, {
    path: '/api/v1',
    domain,
    sameSite: 'strict',
    maxAge: 1000 * 3600,
    httpOnly: true,
    secure: !(NODE_ENV === 'development')
  })
  .json({ data: userForResponse });
```

**Elysia**:
```typescript
import { cookie } from '@elysiajs/cookie';

const app = new Elysia()
  .use(cookie())
  .post('/login', ({ set, cookie: setCookie }) => {
    setCookie('accessToken', accessToken, {
      path: '/api/v1',
      domain,
      sameSite: 'strict',
      maxAge: 1000 * 3600,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development'
    });
    
    return { success: true, user: userForResponse };
  });
```

### 4.8 Request Context Access

**Express**:
```javascript
// In middleware/controller
const correlationId = req.correlationId;
const userId = req.user._id;
const ip = req.ip;
```

**Elysia Context**:
```typescript
// In handler/hook
const correlationId = context.request.headers.get('x-correlation-id');
const userId = context.user._id; // from guard
const ip = context.request.headers.get('x-forwarded-for');
```

### 4.9 Prometheus Metrics Integration

**Current Express**:
```javascript
import promBundle from 'express-prom-bundle';
app.use(metricsMiddleware);
```

**Elysia Approach**:
```typescript
// Custom metrics hook or use third-party Elysia metrics plugin
const metricsHook = (context: Context) => {
  // Record metrics using prom-client directly
  requestCounter.labels(context.request.method, context.request.url).inc();
};

const app = new Elysia()
  .onBeforeHandle(metricsHook);
```

---

## 5. Feature-by-Feature Migration Plan

### 5.1 Feature Module Structure

**Current Express Structure**:
```
features/auth/
├── authController.js    → authController.ts
├── authService.js       → authService.ts
├── authRepository.js    → authRepository.ts
├── authRoutes.js        → authRoutes.ts (or plugin structure)
├── authValidation.js    → Move validation to route schema
├── authMiddleware.js    → authHooks.ts
├── authConstants.js     → authConstants.ts
└── userModel.js         → userModel.ts (Mongoose - no change)
```

**Elysia Feature Structure** (Recommended):
```
features/auth/
├── routes.ts            # All route handlers
├── service.ts           # Business logic
├── repository.ts        # Data access
├── hooks.ts             # Custom hooks (auth, validation)
├── schemas.ts           # Elysia type schemas
├── constants.ts         # Constants
└── models.ts            # Mongoose models
```

### 5.2 11 Features to Migrate

1. **auth** - Login, register, tokens, password reset
2. **health** - Health check endpoints
3. **permissions** - Authorization and role management
4. **search** - Search and analytics
5. **payments** - Payment processing (Razorpay integration)
6. **subscription** - Subscription management
7. **notifications** - Novu integration, push notifications
8. **storage** - S3 file upload/download
9. **gemini** - Google Gemini API integration
10. **audit** - Audit logging
11. **recommendations** - AWS Personalize integration

**Migration Priority**:
1. Core: `auth`, `health`
2. Foundational: `permissions`, `search`
3. Feature-Heavy: `notifications`, `payments`, `subscription`
4. Integrations: `storage`, `gemini`, `recommendations`
5. Non-User-Facing: `audit`

---

## 6. Database Layer (Minimal Changes)

### 6.1 Mongoose Integration
**No changes required** - Mongoose works seamlessly with Elysia.

```typescript
// authRepository.ts (unchanged logic, just TypeScript)
import { User } from './userModel';

export const findUserByEmail = async (email: string) => {
  return await User.findOne({ emailAddress: email }).select('+password');
};
```

### 6.2 PostgreSQL/Drizzle Integration
**No changes required** - Drizzle ORM works with Elysia.

```typescript
// PostgreSQL calls remain the same
import { db } from '../connections/connectPostgres';

export const getPermissions = async (userId: string) => {
  return db.select().from(permissions).where(eq(permissions.userId, userId));
};
```

### 6.3 Redis Integration
**No changes required** - ioredis works with Elysia.

```typescript
// Cache functions remain the same
import { redisClient } from '../connections/connectRedis';

export const getCache = async (key: string) => {
  return await redisClient.get(key);
};
```

---

## 7. Middleware → Hooks Conversion Table

| Express Middleware | Elysia Hook | Conversion Complexity |
|---|---|---|
| `correlationIdMiddleware` | `onBeforeHandle` hook | Low |
| `securityHeaders` | helmet plugin + custom hooks | Low |
| `overloadProtector` | Custom guard | Medium |
| `compression` | `@elysiajs/compress` | Low |
| `limiter` (rate limiting) | `elysia-rate-limit` | Medium |
| `mongoSanitize` | Custom hook (data sanitization) | Medium |
| `hpp` (parameter pollution) | Custom guard | Medium |
| `cors` | `@elysiajs/cors` | Low |
| `metricsMiddleware` | Custom hook using prom-client | Medium |
| `authMiddleware` | Bearer plugin + guard | Medium |
| `timeout handler` | Elysia timeout options | Low |
| `globalErrorHandler` | `.onError()` hook | Medium |

---

## 8. Testing Strategy

### 8.1 Current Testing Stack
- `node:test` (native test runner)
- `supertest` (HTTP testing)
- `node:assert` (assertions)

### 8.2 Elysia Testing Approach
```typescript
// Using Elysia's built-in test utilities
import { describe, it, expect } from '@jest/globals'; // or use native test
import app from './app';

describe('Auth Endpoints', () => {
  it('should login user', async () => {
    const response = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'pass123' })
      })
    );
    
    expect(response.status).toBe(200);
  });
});
```

---

## 9. Configuration & Environment

### 9.1 Environment Variables (No Changes)
All current `.env.development` and `.env.production` variables remain unchanged.

```env
NODE_ENV=development
PORT=8000
DATABASE=mongodb://...
REDIS_HOST=localhost
# ... all others remain the same
```

### 9.2 TypeScript Configuration

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 10. Build & Deployment

### 10.1 Build Changes

**Current Webpack Build**:
```bash
npm run build  # webpack bundling for production
```

**Elysia Approach** (Two options):

**Option A: Bun (Recommended for Elysia)**
```json
{
  "scripts": {
    "dev": "bun run src/index.ts",
    "build": "bun build ./src/index.ts --outdir ./dist --target bun",
    "start": "bun run dist/index.js"
  }
}
```

**Option B: TypeScript compilation**
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc && node -r source-map-support/register dist/index.js",
    "start": "node dist/index.js"
  }
}
```

### 10.2 Docker Updates

**Dockerfile Update**:
```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY bun.lockb .
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8000

CMD ["bun", "run", "src/index.ts"]
```

Or stick with Node if not using Bun:
```dockerfile
FROM node:22-alpine

WORKDIR /app
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 8000

CMD ["node", "dist/index.js"]
```

---

## 11. Detailed Migration Checklist

### Phase 1: Setup & Infrastructure (Week 1)
- [ ] Create TypeScript configuration
- [ ] Install Elysia and core dependencies
- [ ] Setup basic Elysia app structure
- [ ] Configure environment variables for Elysia
- [ ] Setup Bun or TypeScript build pipeline
- [ ] Verify all database connections work
- [ ] Test Redis integration

### Phase 2: Core Utilities & Middleware (Week 1-2)
- [ ] Convert `utils/httpError.ts`
- [ ] Convert `utils/httpResponse.ts`
- [ ] Convert `utils/logger.ts` (keep as-is)
- [ ] Convert error handler to Elysia `.onError()`
- [ ] Implement custom hooks from middlewares
- [ ] Setup CORS, compression, helmet
- [ ] Implement correlation ID tracking
- [ ] Implement rate limiting

### Phase 3: Authentication Feature (Week 2-3)
- [ ] Convert auth routes and controllers
- [ ] Implement bearer token + cookie auth hooks
- [ ] Migrate auth validation (Joi → Elysia schemas)
- [ ] Convert auth service & repository
- [ ] Update MongoDB user model (TypeScript)
- [ ] Test all auth endpoints
- [ ] Test token refresh flow
- [ ] Test logout flow

### Phase 4: Remaining Core Features (Week 3-4)
- [ ] Health check feature
- [ ] Permissions feature
- [ ] Search feature
- [ ] Test each feature thoroughly

### Phase 5: Payment & Subscription (Week 4-5)
- [ ] Payments feature
- [ ] Subscription management
- [ ] Integration with Razorpay

### Phase 6: Notifications & External Services (Week 5-6)
- [ ] Notifications feature (Novu)
- [ ] Storage/S3 feature
- [ ] Gemini integration
- [ ] Recommendations feature

### Phase 7: Audit & Non-Critical Features (Week 6)
- [ ] Audit logging
- [ ] Polish any edge cases

### Phase 8: Testing & Optimization (Week 6-7)
- [ ] Unit tests for all services
- [ ] Integration tests for all API endpoints
- [ ] Performance benchmarking vs Express
- [ ] Load testing with k6 or similar
- [ ] Security audit

### Phase 9: Documentation & Deployment (Week 7-8)
- [ ] Update API documentation (Elysia OpenAPI)
- [ ] Update README and setup guides
- [ ] Docker build and test
- [ ] Kubernetes/deployment pipeline updates
- [ ] Production release

---

## 12. Estimated Effort & Timeline

### Resource Allocation
- **Lead Dev**: 1 full-time (architecture & core modules)
- **Backend Devs**: 1-2 FTE (feature migration)
- **QA**: Part-time (testing & validation)

### Timeline Estimate
- **Total Duration**: 6-8 weeks (part-time) or 3-4 weeks (full-time)
- **Per Feature**: 2-4 days on average
- **Testing & Polish**: 1-2 weeks
- **Buffer**: 1 week

### Risk Factors
1. **Third-party library compatibility** - Mitigated by keeping DB/cache layers unchanged
2. **Performance regression** - Unlikely (Elysia is faster) but should benchmark
3. **Type safety learning curve** - Team should review TypeScript patterns
4. **Integration testing complexity** - Multi-DB setup requires careful testing

---

## 13. Performance Comparison

### Expected Improvements
| Metric | Express | Elysia | Improvement |
|---|---|---|---|
| Requests/sec (JSON response) | ~2,000-3,000 | ~5,000-8,000 | 2-3x faster |
| Memory usage (idle) | 60-80 MB | 40-60 MB | 20-30% lower |
| Cold start time | 800-1200ms | 200-400ms | 2-3x faster |
| Response time (P99) | 50-100ms | 10-30ms | 3-5x faster |

---

## 14. Key Considerations & Best Practices

### 14.1 TypeScript Migration
- Use strict mode from day 1
- Leverage Elysia's type inference for request/response
- Define schemas in separate `schemas.ts` files for reusability
- Use `Pick<Type, Keys>` for partial schema validation

### 14.2 Plugin Architecture
```typescript
// Create feature plugins
export const authPlugin = (app: Elysia) => {
  return app
    .group('/api/v1/auth', (app) =>
      app
        .post('/register', registerHandler)
        .post('/login', loginHandler)
    );
};

// Use in main app
new Elysia()
  .use(authPlugin)
  .use(paymentsPlugin)
  .use(notificationsPlugin)
  .listen(8000);
```

### 14.3 Error Handling Strategy
```typescript
// Custom error class
class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
  }
}

// In error handler
.onError(({ error, set }) => {
  if (error instanceof AppError) {
    set.status = error.statusCode;
    return { success: false, message: error.message };
  }
  // Log unknown errors
  logger.error('Unknown error:', { error });
  set.status = 500;
  return { success: false, message: 'Internal server error' };
});
```

### 14.4 Database Connection Management
Keep connection patterns identical:
```typescript
// src/connections/connectDB.ts
import mongoose from 'mongoose';

export const connectDB = async () => {
  await mongoose.connect(process.env.DATABASE!, {
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE!) || 10,
    // ... other options
  });
};
```

### 14.5 Validation Pattern
```typescript
import { t } from 'elysia';

export const schemas = {
  login: {
    body: t.Object({
      emailAddress: t.String({ format: 'email' }),
      password: t.String({ minLength: 8, maxLength: 24 })
    }),
    response: t.Object({
      success: t.Boolean(),
      data: t.Object({ accessToken: t.String() })
    })
  }
};

// Usage
.post('/login', loginHandler, { 
  body: schemas.login.body,
  response: schemas.login.response 
})
```

---

## 15. Rollback Strategy

### 15.1 Parallel Deployment
- Keep Express version running in parallel during initial Elysia deployment
- Use feature flags to route traffic between versions
- Monitor error rates and performance metrics

### 15.2 Smoke Tests
```typescript
// Critical paths to test before full rollout
const smokeTests = [
  'POST /api/v1/auth/register',
  'POST /api/v1/auth/login',
  'GET /api/v1/health',
  'POST /api/v1/permissions/check',
  'POST /api/v1/notifications/send'
];
```

---

## 16. Dependencies Cleanup Summary

### Remove (No Longer Needed)
```json
{
  "dependencies": {
    "express": null,
    "express-async-handler": null,
    "express-rate-limit": null,
    "express-mongo-sanitize": null, // keep for sanitization logic
    "express-prom-bundle": null,
    "express-timeout-handler": null,
    "cookie-parser": null,
    "hpp": null,
    "compression": null
  },
  "devDependencies": {
    "babel-*": null,
    "webpack": null,
    "webpack-cli": null,
    "webpack-node-externals": null,
    "terser-webpack-plugin": null,
    "dotenv-webpack": null,
    "@babel/*": null
  }
}
```

### Add (Elysia Ecosystem)
```json
{
  "dependencies": {
    "elysia": "^0.9+",
    "@elysiajs/bearer": "latest",
    "@elysiajs/cookie": "latest",
    "@elysiajs/cors": "latest",
    "@elysiajs/swagger": "latest",
    "@elysiajs/compress": "latest",
    "zod": "^3.0+"
  },
  "devDependencies": {
    "typescript": "^5.3+",
    "@types/node": "^20+",
    "tsx": "^4.0+",
    "bun-types": "latest"
  }
}
```

---

## 17. Success Criteria

### Functional
- ✅ All 11 features working without regression
- ✅ All tests passing (unit, integration, E2E)
- ✅ API responses match Express behavior (backward compatible)
- ✅ Database operations identical (same data outcomes)
- ✅ All integrations (Novu, S3, Gemini, etc.) working

### Performance
- ✅ 2x+ throughput improvement
- ✅ Response time P99 < 50ms for simple queries
- ✅ Memory usage < 70MB idle
- ✅ Cold start < 500ms

### Operations
- ✅ Docker deployment works
- ✅ Kubernetes manifests compatible
- ✅ Monitoring/logging unchanged
- ✅ Health checks responsive

---

## 18. Detailed File Migration Map

### Core App Structure
```
src/
├── index.ts                 # App entry (keep same)
├── app.ts                   # NEW: Main Elysia app (replaces app.js)
├── config/                  # NO CHANGES
├── connections/             # NO CHANGES (DB/Cache logic)
├── db/                       # NO CHANGES (Drizzle/Mongoose)
├── utils/
│   ├── httpError.ts         # CONVERT: Use Elysia error classes
│   ├── httpResponse.ts      # CONVERT: Adapt for context
│   ├── logger.ts            # NO CHANGES
│   └── quicker.ts           # KEEP AS-IS
├── helpers/                 # MINIMAL CHANGES (keep logic)
├── middlewares/             # CONVERT → HOOKS (hooks.ts per feature)
└── features/                # MAJOR REFACTOR (see 5.1)
```

---

## 19. Example: Complete Auth Feature Migration

### Current Structure
```javascript
// authRoutes.js
const router = express.Router();
router.post('/register', protect, register);
export default router;

// authController.js
export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateRegisterBody, req.body);
  if (error) return httpError(next, error, req, 422);
  const newUser = await authService.registerUser(value);
  httpResponse(req, res, 201, SUCCESS, { _id: newUser._id });
});
```

### Elysia Structure
```typescript
// routes.ts
import { Elysia, t } from 'elysia';
import { registerHandler, loginHandler } from './handlers';
import { authGuard } from './hooks';

export const authPlugin = new Elysia({ prefix: '/api/v1/auth' })
  .use(authGuard)
  .post('/register', registerHandler, {
    body: t.Object({
      name: t.String({ minLength: 2, maxLength: 72 }),
      emailAddress: t.String({ format: 'email' }),
      phoneNumber: t.String({ minLength: 4, maxLength: 20 }),
      password: t.String({ minLength: 8, maxLength: 24 }),
      consent: t.Boolean()
    }),
    response: t.Object({
      success: t.Boolean(),
      data: t.Object({ _id: t.String() })
    })
  })
  .post('/login', loginHandler);

// handlers.ts
export const registerHandler = async ({ body, set }: Context) => {
  const newUser = await authService.registerUser(body);
  set.status = 201;
  return {
    success: true,
    message: 'User registered',
    data: { _id: newUser._id }
  };
};

// hooks.ts
export const authGuard = (app: Elysia) => {
  return app.guard(
    {
      async beforeHandle({ headers, cookie, set }) {
        const token = headers.authorization?.split(' ')[1] || cookie.jwt?.value;
        if (!token) throw new Error('Not authenticated');
        const user = await verifyToken(token);
        return { user };
      }
    },
    (app) => app // Routes that need protection
  );
};
```

---

## 20. Migration Validation Checklist

For each feature after migration:

```typescript
// test-migration-validation.ts
const validateMigration = async (feature: string) => {
  const tests = [
    // Data integrity
    { name: 'MongoDB queries return same data', fn: testMongoQueries },
    { name: 'PostgreSQL queries return same data', fn: testPostgresQueries },
    { name: 'Redis cache works identically', fn: testRedisCache },
    
    // API Contract
    { name: 'Response format matches Express', fn: testResponseFormat },
    { name: 'Error responses match Express', fn: testErrorResponses },
    { name: 'Status codes correct', fn: testStatusCodes },
    
    // Security
    { name: 'Auth tokens work', fn: testTokens },
    { name: 'CORS working', fn: testCORS },
    { name: 'Rate limiting works', fn: testRateLimiting },
    
    // Performance
    { name: 'Response time acceptable', fn: testResponseTime },
    { name: 'Memory stable', fn: testMemory }
  ];
  
  for (const test of tests) {
    console.log(`Testing ${feature}: ${test.name}...`);
    await test.fn();
  }
};
```

---

## 21. FAQ & Troubleshooting

### Q: Can I keep using Joi for validation?
**A**: Yes, but Elysia's native `t.Object()` is recommended. Alternatively, integrate Zod which has better TypeScript support.

### Q: What about WebSocket support?
**A**: Elysia has excellent WebSocket support via `.ws()`. If using Socket.IO, migrate to native WebSockets.

### Q: Do I need to rewrite tests?
**A**: Test logic remains same, but adapt to Elysia's request handling (use `app.handle(request)` instead of supertest).

### Q: Will this break my CI/CD?
**A**: Update build scripts and Docker images. Environment variables remain unchanged. Tests need adaptation.

### Q: Performance guarantees?
**A**: No guarantees, but Elysia typically shows 2-3x improvement. Benchmark your specific workloads.

### Q: Backward compatibility?
**A**: API responses can be kept identical. Database layer unchanged. Client code requires no changes.

---

## 22. Support & Resources

### Elysia Official Documentation
- [Elysia.js Documentation](https://elysiajs.com)
- [GitHub Repository](https://github.com/elysiajs/elysia)
- [Discord Community](https://discord.gg/elysia)

### Migration-Specific Resources
- Express to Elysia migration guide (in Elysia docs)
- TypeScript best practices (official TypeScript handbook)
- Zod validation library (if migrating from Joi)

### Benchmarking Tools
- `autocannon` - HTTP benchmarking
- `k6` - Load testing
- `clinic.js` - Node.js profiling

---

## 23. Conclusion

Migrating from Express.js to Elysia.js is a worthwhile investment for this production-grade application. The main benefits are:

1. **Performance**: 2-3x faster request handling
2. **Type Safety**: Full TypeScript support with better inference
3. **Developer Experience**: Cleaner plugin system, built-in validation
4. **Maintainability**: Smaller codebase with native features
5. **Modern Stack**: Aligns with 2024+ web framework standards

The migration is **low risk** because:
- Database layers (Mongoose, Drizzle, Redis) remain unchanged
- External service integrations are framework-agnostic
- Existing utilities can be adapted with minimal changes
- Tests validate correctness at each step

**Recommended Approach**: Implement in phases, starting with core features, with parallel testing and validation at each step.

---

## Appendix A: Environment Variables (No Changes)

```env
# All existing variables work unchanged
NODE_ENV=development
PORT=8000
DATABASE=...
REDIS_HOST=...
POSTGRES_DATABASE_URL=...
JWT_SECRET=...
# ... etc
```

## Appendix B: Sample Elysia App Skeleton

```typescript
// src/app.ts
import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { bearer } from '@elysiajs/bearer';
import { cookie } from '@elysiajs/cookie';
import { compress } from '@elysiajs/compress';
import { swagger } from '@elysiajs/swagger';

// Features
import { authPlugin } from './features/auth/routes';
import { healthPlugin } from './features/health/routes';

const app = new Elysia()
  // Plugins
  .use(cors())
  .use(cookie())
  .use(compress())
  .use(swagger())
  
  // Features
  .use(authPlugin)
  .use(healthPlugin)
  
  // Global error handler
  .onError(({ error, set }) => {
    set.status = 'Internal Server Error';
    return { success: false, message: error.message };
  })
  
  // Root endpoint
  .get('/', () => ({ message: 'Welcome to Auth Service 🚀' }))
  
  // 404 handler
  .all('*', ({ set }) => {
    set.status = 404;
    return { success: false, message: 'Not found' };
  });

export default app;
```

---

**Document Version**: 1.0  
**Created**: November 2025  
**Last Updated**: November 2025  
**Status**: Ready for Implementation
