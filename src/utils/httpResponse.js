import { EApplicationEnvironment } from '../helpers/application.js';
import { logger } from './logger.js';

export const httpResponse = (req, res, responseStatusCode, responseMessage, data = null) => {
  const response = {
    success: true,
    statusCode: responseStatusCode,
    request: {
      ip: req.ip || null,
      method: req.method,
      url: req.originalUrl,
      correlationId: req.correlationId || null
    },
    message: responseMessage,
    data
  };

  // Production Env check
  if (process.env.NODE_ENV === EApplicationEnvironment.PRODUCTION) {
    delete response.request.ip;
    // delete response.request.correlationId;
  }

  // Send response first
  res.status(responseStatusCode).json(response);

  // Log after response is sent
  logger.info(`CONTROLLER_RESPONSE`, {
    meta: response
  });
};
