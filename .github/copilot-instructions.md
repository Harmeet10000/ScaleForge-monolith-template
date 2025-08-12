```xml
<copilot-instructions>

<project-overview>
    This is a production-grade authentication service built with Node.js, Express, MongoDB, and Redis. The codebase follows enterprise-level patterns with a focus on security, scalability, and maintainability.
</project-overview>

<project-structure>
    <directory-organization>
    ```
    src/
    ├── connections/     # Database and external service connections (e.g., Redis, Mongoose)
    ├── constants/       # Application constants and enums
    ├── controllers/     # Request handlers (thin layer)
    ├── helpers/         # Utility functions for specific services
    ├── middlewares/     # Express middleware functions (auth, error handling)
    ├── models/          # Mongoose schemas and models
    ├── repository/      # Data access layer (DAL) implementing the Repository Pattern
    ├── routes/          # API route definitions
    ├── services/        # Business logic layer
    ├── utils/           # General, reusable utility functions (e.g., logger, httpError)
    ├── validations/     # Joi validation schemas
    ├── app.js           # Express app configuration
    └── index.js         # Application entry point
    ```
    </directory-organization>
</project-structure>

<architecture>
    <general-principles>
        - Follow best practices for enterprise-grade applications.
        - Prioritize modularity, DRY (Don't Repeat Yourself), performance, and security.
        - First, break complex tasks into distinct, prioritized steps, then implement them.
        - Prioritize the tasks and steps you will address in each response.
    </general-principles>

    <layered-architecture>
        1. **Controller Layer (`/controllers`)**: Handles HTTP requests/responses, input validation, and delegates tasks to the service layer. Should remain thin.
        2. **Service Layer (`/services`)**: Contains all business logic. Orchestrates calls to the repository layer and other services.
        3. **Repository Layer (`/repository`)**: Provides an abstraction over the database. All database queries should be handled here.
        4. **Model Layer (`/models`)**: Defines Mongoose database schemas and data models.
    </layered-architecture>

    <design-patterns>
        - **Repository Pattern**: Abstract all database operations in the `/repository` directory.
        - **Singleton Pattern**: Use for database connections (Mongoose) and the Redis client to ensure a single instance.
        - **Middleware Pattern**: Use for cross-cutting concerns like authentication, logging, and error handling in the `/middlewares` directory.
    </design-patterns>
</architecture>

<coding-standards>
    <general-rules>
        - Use ES module syntax (`import`/`export`).
        - Favor modern JavaScript features (ES2020+), including optional chaining (`?.`) and nullish coalescing (`??`).
        - Use destructuring for objects and arrays where it improves readability.
        - If you cannot finish a piece of code, add a `// TODO:` comment explaining what's left.
    </general-rules>

    <code-style>
        - Follow the configurations in `eslint.config.js` and `.prettierrc`.
    </code-style>

    <naming-conventions>
        - **Files**: `camelCase.js`
        - **Functions/Variables**: `camelCase`
        - **Constants**: `UPPER_SNAKE_CASE`
        - **Environment Variables**: `UPPER_SNAKE_CASE`
    </naming-conventions>
</coding-standards>

<implementation-details>
    <error-handling>
        - Use the `httpError` utility from `/utils` for creating consistent, standardized HTTP errors.
        - Wrap all asynchronous controller functions and middlewares with the `catchAsync` utility from `/utils` to handle errors gracefully and pass them to the global error handler.
        - The `globalErrorHandler` middleware in `/middlewares` is responsible for processing all errors and sending a formatted response.
    </error-handling>

    <logging>
        - Use the `logger` utility from `/utils` for all logging.
        - Use appropriate log levels: `logger.error()`, `logger.warn()`, `logger.info()`, `logger.debug()`.
        - Always include meaningful context in logs, such as `userId`, `action`, `ip`, and relevant metadata.
        - Example: `logger.error('Failed to process payment', { meta: { error: err.message, userId: user._id } });`
    </logging>

    <response-handling>
        - Use the `httpResponse` utility from `/utils` to send all successful responses from controllers. This ensures a consistent response format across the API.
    </response-handling>

    <input-validation>
        - Validate all incoming request bodies, params, and queries.
        - Define validation schemas using Joi in the `/validations` directory.
        - Apply validation middleware in the routes, before the controller handler.
    </input-validation>

    <database>
        - All database interactions must go through the repository layer (`/repository`).
        - Define Mongoose schemas in `/models` with proper types, validation (`required`, `trim`, `maxlength`), and indexes.
        - Use `.lean()` for read-only queries to improve performance.
        - Use `.select()` to limit the fields returned from a query.
        - Example Schema:
            ```javascript
            const userSchema = new mongoose.Schema({
              name: { type: String, required: true, trim: true },
              email: { type: String, required: true, unique: true, lowercase: true, index: true }
            }, { timestamps: true });
            ```
    </database>

    <caching>
        - Use Redis for caching frequently accessed data.
        - The pattern should be:
            1. Check for data in the Redis cache first.
            2. If cache miss, fetch data from the database (via repository).
            3. Store the result in Redis with a reasonable expiry time (TTL).
            4. When data is updated or deleted, invalidate/clear the corresponding Redis cache key.
    </caching>

    <security>
        - Use the `authMiddleware` for protecting routes that require authentication and authorization.
        - Never store secrets or sensitive data directly in the code. Use environment variables.
        - Always validate and sanitize user input to prevent injection attacks.
        - Follow OWASP Top 10 best practices.
    </security>

    <environment>
        - Use the `dotenv` package to manage environment variables.
        - The `.env.dev` file is used for the development environment.
        - Ensure all sensitive keys (API keys, database URIs, JWT secrets) are stored in environment variables and never committed to the repository.
    </environment>

    <documentation>
        - API documentation is managed using Swagger.
        - Update the JSDoc comments in the routes files to reflect new or changed API endpoints.
        - Generate the final Swagger documentation using the `npm run swagger` script.
    </documentation>
</implementation-details>

<development-workflow>
    <testing>
        - Write unit tests for all services and critical utility functions.
        - Write integration tests for all API endpoints.
        - Organize all test files in the `test/` directory.
        - Use `node:test` for the test runner and `node:assert` for assertions.
        - Structure tests using `describe`, `it`, `before`, and `after` blocks.
    </testing>

    <linting-formatting>
        - Before committing code, always run `npm run lint` and `npm run format`.
        - To automatically fix issues, use `npm run lint:fix` and `npm run format:fix`.
        - These checks are enforced by pre-commit hooks.
    </linting-formatting>

    <version-control>
        - Follow the commit message conventions defined in `commitlint.config.js`.
        - `husky` and `lint-staged` are configured to run pre-commit checks (linting, formatting).
    </version-control>

    <code-review-checklist>
        - [ ] Follows existing patterns and architecture.
        - [ ] Includes proper error handling using `httpError` and `catchAsync`.
        - [ ] Has appropriate, contextual logging.
        - [ ] Includes unit and/or integration tests.
        - [ ] Updates Swagger/JSDoc documentation if an API endpoint is changed.
        - [ ] No hardcoded secrets or sensitive values.
        - [ ] Validates all inputs from requests.
        - [ ] Handles edge cases.
    </code-review-checklist>
</development-workflow>

<deployment>
    <docker>
        - Use the `dev.Dockerfile` located in the `docker/` directory for local development builds.
        - Use the `prod.Dockerfile` located in the `docker/` directory for production builds.
    </docker>
    <environment-check>
        - Ensure the correct `.env` file is used for the target environment.
        - Verify all external connections (Database, Redis) are correctly configured before deploying.
    </environment-check>
</deployment>

<resources>
    - [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
    - [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
    - [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
    - [OWASP Top 10](https://owasp.org/www-project-top-ten/)
</resources>

</copilot-instructions>
```
