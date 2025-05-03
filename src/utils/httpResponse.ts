import { Request, Response } from 'express';
import { EApplicationEnvironment } from '../constant/application.js';
import { THttpResponse } from '../types/types.js';
import { logger } from './logger.js';
import process from 'process';

export const httpResponse = (
  req: Request,
  res: Response,
  responseStatusCode: number,
  responseMessage: string,
  data: unknown = null
): void => {
  const response: THttpResponse = {
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
