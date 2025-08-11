# Copilot Rules - Production-Grade Authentication Template

## 🎯 Project Overview
This is a production-grade authentication service built with Node.js, Express, MongoDB, and Redis. The codebase follows enterprise-level patterns with a focus on security, scalability, and maintainability.

## 📁 Project Structure

## General

- Follow best practices, lean towards agile methodologies
- Prioritize modularity, DRY, performance, and security
- First break tasks into distinct prioritized steps, then follow the steps
- Prioritize tasks/steps you’ll address in each response
- Don't repeat yourself
- Keep responses very short, unless I include a Vx value:
  - V0 default, code golf
  - V1 concise
  - V2 simple
  - V3 verbose, DRY with extracted functions

## Code

- Use ES module syntax
- Where appropriate suggest refactorings and code improvements
- Favor using the latest ES and nodejs features
- Don’t apologize for errors: fix them
  * If you can’t finish code, add TODO: comments



### Directory Organization
```
src/
├── connections/     # Database and external service connections
├── constants/       # Application constants and enums
├── controllers/     # Request handlers (thin layer)
├── helpers/        # Utility functions for specific services
├── middlewares/    # Express middleware functions
├── models/         # Mongoose schemas and models
├── repository/     # Data access layer (DAL)
├── routes/         # API route definitions
├── services/       # Business logic layer
├── utils/          # General utility functions
├── validations/    # Joi validation schemas
├── app.js          # Express app configuration
└── index.js        # Application entry point
```

## 🏗️ Architecture Patterns

### Layered Architecture
1. **Controller Layer**: Handles HTTP requests/responses, validation, and delegates to services
2. **Service Layer**: Contains business logic, orchestrates repository calls
3. **Repository Layer**: Data access abstraction, database queries
4. **Model Layer**: Database schemas and data models

### Design Patterns Used
- **Repository Pattern**: Abstract database operations
- **Service Factory Pattern**: Create service instances
- **Middleware Pattern**: Cross-cutting concerns (auth, error handling)
- **Singleton Pattern**: Database connections, Redis client
- **Error Handler Pattern**: Centralized error handling

## 📝 Coding Standards

### JavaScript/ES6+ Standards
```javascript
// ✅ Use ES6 modules
import { functionName } from './module.js';
export const myFunction = () => {};

// ✅ Use async/await over callbacks
const fetchData = async () => {
  try {
    const result = await someAsyncOperation();
    return result;
  } catch (error) {
    throw error;
  }
};

// ✅ Use destructuring
const { name, email } = user;

// ✅ Use template literals
const message = `Welcome ${userName}`;

// ✅ Use optional chaining
const city = user?.address?.city;

// ✅ Use nullish coalescing
const port = process.env.PORT ?? 3000;
```

### Naming Conventions
```javascript
// Files: camelCase
authController.js
userModel.js
authService.js

// Classes: PascalCase
class UserModel {}

// Functions/Variables: camelCase
const getUserById = async (id) => {};
const userName = 'John';

// Constants: UPPER_SNAKE_CASE
const MAX_LOGIN_ATTEMPTS = 5;
const TOKEN_EXPIRY_TIME = 3600;

// Environment variables: UPPER_SNAKE_CASE
process.env.DATABASE_URL
process.env.JWT_SECRET

// Private functions: Leading underscore (if needed)
const _privateHelper = () => {};
```

### Code Style Rules (ESLint + Prettier)
```javascript
// Semicolons: Always use
const name = 'John';

// Quotes: Single quotes for strings
const message = 'Hello World';

// Indentation: 2 spaces
if (condition) {
  doSomething();
}

// Max line length: 100 characters
// Trailing commas: Never
const obj = {
  key1: 'value1',
  key2: 'value2'
};

// Arrow functions: Prefer for callbacks
array.map((item) => item * 2);

// Equality: Use strict equality
if (value === expected) {}
```

## 🔐 Security Best Practices

### Authentication & Authorization
```javascript
// Always hash passwords with bcrypt
import bcrypt from 'bcryptjs';
const hashedPassword = await bcrypt.hash(password, 12);

// JWT token generation with proper expiry
const token = jwt.sign(
  { userId, role, userIp },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Validate JWT and check IP
const decoded = jwt.verify(token, process.env.JWT_SECRET);
if (decoded.userIp !== req.ip) {
  throw new Error('Invalid token for this IP');
}

// Use HTTP-only cookies for tokens
res.cookie('token', tokenValue, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 3600000
});
```

### Input Validation
```javascript
// Always validate with Joi
import Joi from 'joi';

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(24).required()
});

const { error, value } = schema.validate(input);
if (error) {
  return httpError(next, error, req, 422);
}
```

### Security Middleware
```javascript
// Apply security headers
app.use(helmet());

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// MongoDB sanitization
app.use(mongoSanitize());

// XSS protection
app.use(xss());

// Parameter pollution protection
app.use(hpp());
```

## 🎭 Error Handling Patterns

### Centralized Error Handling
```javascript
// Use catchAsync wrapper for async routes
export const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

// Controller usage
export const getUser = catchAsync(async (req, res, next) => {
  const user = await userService.findById(req.params.id);
  httpResponse(req, res, 200, SUCCESS, user);
});

// Consistent error responses
export const httpError = (next, err, req, statusCode = 500) => {
  const errorObj = {
    success: false,
    statusCode,
    message: err.message,
    request: {
      method: req.method,
      url: req.originalUrl
    }
  };
  
  logger.error('CONTROLLER_ERROR', { meta: errorObj });
  return next(errorObj);
};
```

## 📊 Database Patterns

### MongoDB/Mongoose Best Practices
```javascript
// Schema definition with proper types
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [72, 'Name cannot exceed 72 characters']
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Use lean() for read-only queries
const users = await User.find().lean();

// Use select() to limit fields
const user = await User.findById(id).select('-password -__v');

// Use indexes for frequently queried fields
userSchema.index({ email: 1, createdAt: -1 });
```

### Redis Caching Pattern
```javascript
// Cache with expiry
await setHash('user', ['email', email], userData, 1800); // 30 min

// Check cache before database
let user = await getHash('user', ['email', email]);
if (!user) {
  user = await User.findOne({ email });
  if (user) {
    await setHash('user', ['email', email], user.toObject(), 1800);
  }
}

// Clear cache on updates
await deleteCache('user', ['id', userId]);
```

## 🧪 Testing Guidelines

### Test Structure
```javascript
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('AuthController', () => {
  before(async () => {
    // Setup
  });

  after(async () => {
    // Cleanup
  });

  it('should register a new user', async () => {
    // Test implementation
  });
});
```

### Test Coverage Areas
1. Unit tests for services and helpers
2. Integration tests for API endpoints
3. Validation tests for Joi schemas
4. Error handling tests
5. Security tests (auth, rate limiting)


## 🤖 Agentic Coding Best Practices

### When Writing New Features
1. **Always check existing patterns** before implementing
2. **Follow the layered architecture**: Controller → Service → Repository
3. **Add proper validation** using Joi schemas
4. **Implement error handling** with catchAsync
5. **Add logging** for debugging
6. **Update tests** for new functionality
7. **Document API changes** in Swagger or Postman

### Code Generation Guidelines
```javascript
// ✅ DO: Follow existing patterns
export const newFeature = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(schema, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  
  const result = await service.processFeature(value);
  httpResponse(req, res, 200, SUCCESS, result);
});

// ❌ DON'T: Mix concerns or skip validation
export const badExample = async (req, res) => {
  // Direct database access in controller
  const user = await User.findById(req.params.id);
  res.json(user);
};
```

### Refactoring Guidelines
1. **Maintain backward compatibility** unless explicitly breaking
2. **Update all related tests** when changing functionality
3. **Keep commits atomic** - one logical change per commit
4. **Update documentation** inline with code changes
5. **Run full test suite** before committing

### Logging Standards
```javascript
// Use appropriate log levels
logger.error('Critical error', { meta: { error: err.message } });
logger.warn('Warning message', { meta: { userId } });
logger.info('Info message', { meta: { action: 'user_login' } });
logger.debug('Debug info', { meta: { data } });

// Always include context
logger.info('User action', {
  meta: {
    userId: user._id,
    action: 'password_reset',
    ip: req.ip,
    timestamp: new Date()
  }
});
```

## 📚 Common Patterns Reference

### Service Pattern
```javascript
// services/featureService.js
export const createFeature = async (data) => {
  // Validation and business logic
  const validated = validateBusinessRules(data);
  
  // Repository calls
  const result = await repository.create(validated);
  
  // Post-processing
  await sendNotification(result);
  
  return result;
};
```

### Repository Pattern
```javascript
// repository/featureRepository.js
export const create = async (data) => {
  const feature = new Feature(data);
  return await feature.save();
};

export const findById = async (id, select = '') => {
  return await Feature.findById(id).select(select).lean();
};

export const update = async (id, data) => {
  return await Feature.findByIdAndUpdate(
    id,
    data,
    { new: true, runValidators: true }
  );
};
```

### Middleware Pattern
```javascript
// middlewares/customMiddleware.js
export const customMiddleware = (options = {}) => {
  return catchAsync(async (req, res, next) => {
    // Middleware logic
    if (someCondition) {
      return httpError(next, new Error('Condition failed'), req, 400);
    }
    
    // Attach data to request
    req.customData = processedData;
    
    next();
  });
};
```

## 🔧 Maintenance Guidelines

### Regular Tasks
1. **Update dependencies** monthly (security patches immediately)
2. **Review and rotate** secrets quarterly
3. **Audit logs** for suspicious activity
4. **Monitor performance** metrics
5. **Backup database** regularly
6. **Update documentation** with changes

### Code Review Checklist
- [ ] Follows existing patterns
- [ ] Includes proper error handling
- [ ] Has appropriate logging
- [ ] Includes tests
- [ ] Updates documentation
- [ ] No hardcoded secrets
- [ ] Validates all inputs
- [ ] Handles edge cases
- [ ] Performance optimized
- [ ] Security reviewed

## 🚨 Important Notes

1. **Never commit secrets** to the repository
2. **Always validate user input** before processing
3. **Use parameterized queries** to prevent SQL injection
4. **Implement rate limiting** on all public endpoints
5. **Keep dependencies updated** for security
6. **Use HTTPS in production** always
7. **Implement proper CORS** policies
8. **Monitor application logs** regularly
9. **Backup data** before major changes
10. **Test thoroughly** before deployment

## 📞 Support & Resources

- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**Version**: 1.0.0
