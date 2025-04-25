# Copilot Instructions

## Overview

This document provides guidelines and instructions for using GitHub Copilot effectively within this project. The instructions are tailored to the structure and conventions of this codebase.

---

## General Guidelines

1. **Code Style**:

   - Follow the ESLint and Prettier configurations defined in `eslint.config.js` and `.prettierrc`.
   - Use single quotes for strings and ensure proper indentation.
   - Avoid unused variables and ensure all code is clean and readable.

<!-- 2. **TypeScript and JavaScript**:

   - Use TypeScript for type safety where applicable, as seen in `types/`.
   - Ensure strict type-checking by adhering to the `tsconfig.json` settings. -->

2. **Error Handling**:

   - Use the `httpError` utility for consistent error handling.
   - Wrap asynchronous functions with `catchAsync` to handle errors gracefully.

3. **Logging**:
   - Use the `logger` utility for logging errors, warnings, and information.
   - Ensure logs are meaningful and provide context for debugging.

---

## Specific Instructions

### Backend Development

1. **Controllers**:

   - Use the `httpResponse` utility to send consistent responses.
   - Validate request bodies using Joi schemas defined in `validations/`.

2. **Services**:

   - Keep business logic in the `services/` directory.
   - Ensure services are modular and reusable.

3. **Middlewares**:

   - Use `authMiddleware` for authentication and authorization.
   - Implement global error handling using `globalErrorHandler`.

4. **Database**:

   - Use Mongoose models defined in `models/` for database interactions.
   - Follow the repository pattern as seen in `repository/` for database queries.

5. **Environment Variables**:

   - Use `dotenv` for managing environment variables.
   - Ensure sensitive data is stored securely and not committed to the repository.

6. **Swagger Documentation**:
   - Update `swagger.js` to reflect new API endpoints.
   - Generate Swagger documentation using the `swagger` script.

---

## Testing and Linting

1. **Testing**:

   - Write unit tests for critical functions and services.
   - Use the `test/` directory for organizing test files.

2. **Linting and Formatting**:
   - Run `npm run lint` and `npm run format` before committing code.
   - Fix linting and formatting issues using `npm run lint:fix` and `npm run format:fix`.

---

## Deployment

1. **Docker**:

   - Use the `Dockerfile` in `docker/dev/` for development builds.
   - Use the `Dockerfile` in `docker/prod/` for production builds.

2. **Environment**:
   - Ensure the correct `.env` file is used for the target environment.
   - Verify database and Redis connections before deployment.

---

## Additional Notes

- Follow commit message conventions defined in `commitlint.config.js`.
- Use `husky` and `lint-staged` for pre-commit checks.
- Refer to the `README.md` for project-specific details.
