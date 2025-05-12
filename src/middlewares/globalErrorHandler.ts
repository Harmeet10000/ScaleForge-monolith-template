import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { httpError } from '../utils/httpError';
import config from '../config/dotenvConfig';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number | string; // PostgreSQL error codes are strings
  path?: string;
  value?: unknown;
  errmsg?: string; // Mongoose specific, might not be present
  errors?: Record<string, { message: string }>; // Mongoose specific
  request?: Request;
  // PostgreSQL specific error fields (optional, from node-postgres)
  constraint?: string;
  table?: string;
  column?: string;
  dataType?: string;
  detail?: string;
  routine?: string;
}

// Removed Mongoose-specific handlers: handleCastErrorDB, handleDuplicateFieldsDB, handleValidationErrorDB

const handlePgUniqueViolation = (
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const message =
    err.detail ||
    `Duplicate field value. Please use another value! Constraint: ${err.constraint || 'unknown'}`;
  httpError(next, new Error(message), req, 400); // 400 Bad Request or 409 Conflict
  return err;
};

const handlePgNotNullViolation = (
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const column = err.column || 'unknown';
  const message = `Field '${column}' cannot be null.`;
  httpError(next, new Error(message), req, 400);
  return err;
};

const handlePgForeignKeyViolation = (
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const constraint = err.constraint || 'unknown';
  const message = `Foreign key constraint '${constraint}' violated. Related record does not exist.`;
  httpError(next, new Error(message), req, 400);
  return err;
};

const handlePgInvalidTextRepresentation = (
  // Error code 22P02
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const message = err.detail || `Invalid input syntax for type. Check data types.`;
  httpError(next, new Error(message), req, 400);
  return err;
};

const handleJWTError = (err: CustomError, next: NextFunction, req: Request): CustomError => {
  httpError(next, new Error('Invalid token. Please log in again!'), req, 401);
  return err;
};

const handleJWTExpiredError = (err: CustomError, next: NextFunction, req: Request): CustomError => {
  httpError(next, new Error('Your token has expired! Please log in again.'), req, 401);
  return err;
};

const sendErrorDev = (err: CustomError, res: Response): void => {
  logger.error(`🛑 Dev Error: ${err.message}\nStack: ${err.stack}`);

  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    request: err.request
  });
};

const sendErrorProd = (err: CustomError, res: Response): void => {
  if (err.isOperational) {
    logger.warn(`⚠️ Operational Error: ${err.message}`);
    res.status(err.statusCode || 500).json({
      success: false,
      status: err.status,
      message: err.message,
      request: err.request
    });
  } else {
    logger.error(`💥 Unknown Error: ${err.message}\nStack: ${err.stack}`);
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went very wrong!',
      request: err.request
    });
  }
};

export const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (config.NODE_ENV === 'production') {
    let error: CustomError = { ...err, message: err.message, stack: err.stack }; // Ensure message and stack are copied

    // Handle PostgreSQL specific errors by code
    // Note: err.code from node-postgres is a string
    if (typeof error.code === 'string') {
      switch (error.code) {
        case '23505': // unique_violation
          error = handlePgUniqueViolation(error, next, req);
          break;
        case '23502': // not_null_violation
          error = handlePgNotNullViolation(error, next, req);
          break;
        case '23503': // foreign_key_violation
          error = handlePgForeignKeyViolation(error, next, req);
          break;
        case '22P02': // invalid_text_representation (generic casting/format error)
          error = handlePgInvalidTextRepresentation(error, next, req);
          break;
        // Add more PostgreSQL error codes as needed
        default:
          // Log unhandled PG errors if necessary
          logger.warn(`Unhandled PostgreSQL error code: ${error.code}`, {
            errorDetail: error.detail
          });
          break;
      }
    }

    // Handle JWT errors (these are not DB specific)
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError(error, next, req);
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError(error, next, req);
    }

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;
