import { NextFunction, Request } from 'express';
import { EApplicationEnvironment } from '../constant/application.js';
import { SOMETHING_WENT_WRONG } from '../constant/responseMessage.js';
import { THttpError } from '../types/types.js';
import { logger } from './logger.js';
import process from 'process';

export const httpError = (
  nextFunc: NextFunction,
  err: Error,
  req: Request,
  errorStatusCode = 500
) => {
  const errorObj: THttpError = errorObject(err, req, errorStatusCode);
  return nextFunc(errorObj);
};

const errorObject = (err: Error, req: Request, errorStatusCode = 500): THttpError => {
  const errorObj: THttpError = {
    name: err instanceof Error ? err.name : 'Error',
    success: false,
    statusCode: errorStatusCode,
    request: {
      ip: req.ip || null,
      method: req.method,
      url: req.originalUrl
    },
    message: err instanceof Error ? err.message || SOMETHING_WENT_WRONG : SOMETHING_WENT_WRONG,
    data: null,
    trace: err instanceof Error ? { error: err.stack } : null
  };

  // Log
  logger.error(`CONTROLLER_ERROR`, {
    meta: errorObj
  });

  // Production Env check
  if (process.env.NODE_ENV === EApplicationEnvironment.PRODUCTION) {
    delete errorObj.request.ip;
    delete errorObj.trace;
  }

  return errorObj;
};
