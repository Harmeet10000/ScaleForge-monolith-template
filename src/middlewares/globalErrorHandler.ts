import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { httpError } from '../utils/httpError';
import config from '../config/dotenvConfig';

interface CustomError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
  code?: number;
  path?: string;
  value?: any;
  errmsg?: string;
  errors?: Record<string, { message: string }>;
  request?: Request;
}

const handleCastErrorDB = (err: CustomError, next: NextFunction, req: Request): CustomError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  httpError(next, new Error(message), req, 400);
  return err;
};

const handleDuplicateFieldsDB = (
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0] || '';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  httpError(next, new Error(message), req, 400);
  return err;
};

const handleValidationErrorDB = (
  err: CustomError,
  next: NextFunction,
  req: Request
): CustomError => {
  const errors = Object.values(err.errors || {}).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
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
  if (config.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (config.NODE_ENV === 'production') {
    let error: CustomError = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    if (error.name === 'CastError') {
      error = handleCastErrorDB(error, next, req);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error, next, req);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error, next, req);
    }
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
