import { EApplicationEnvironment } from '../constant/application.js';
import { logger } from './logger.js';

// /**
//  * Sends a standardized HTTP response with optional compression for large payloads
//  * @param {Object} req - Express request object
//  * @param {Object} res - Express response object
//  * @param {Number} responseStatusCode - HTTP status code
//  * @param {String} responseMessage - Response message
//  * @param {Object|null} data - Response data
//  */
export const httpResponse = (req, res, responseStatusCode, responseMessage, data = null) => {
  const response = {
    success: true,
    statusCode: responseStatusCode,
    request: {
      ip: req.ip || null,
      method: req.method,
      url: req.originalUrl
    },
    message: responseMessage,
    data
  };

  // Log
  logger.info(`CONTROLLER_RESPONSE`, {
    meta: response
  });

  // Production Env check
  if (process.env.NODE_ENV === EApplicationEnvironment.PRODUCTION) {
    delete response.request.ip;
  }

  //   // Set Content-Type header
  //   res.setHeader('Content-Type', 'application/json');

  //   // Add Cache-Control header for responses that can be cached
  //   if ([200, 201, 304].includes(responseStatusCode)) {
  //     res.setHeader('Cache-Control', 'public, max-age=60'); // Cache successful responses for 60 seconds
  //   } else {
  //     res.setHeader('Cache-Control', 'no-store'); // Don't cache error responses
  //   }

  // The compression middleware added in app.js will handle the gzip compression
  // based on request headers and response size
  res.status(responseStatusCode).json(response);
};
