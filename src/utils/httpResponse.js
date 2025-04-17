import { EApplicationEnvironment } from '../constant/application.js';
import { logger } from './logger.js';

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

  res.status(responseStatusCode).json(response);
};
