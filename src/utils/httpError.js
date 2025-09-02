import { EApplicationEnvironment } from '../helpers/application.js';
import { SOMETHING_WENT_WRONG } from '../features/auth/authConstants.js';
import { logger } from './logger.js';

export const httpError = (next, err, req, errorStatusCode = 500) => {
  const errorObj = errorObject(err, req, errorStatusCode);

  if (typeof next === 'function') {
    return next(errorObj);
  }

  // If next is not a function, throw the error
  throw errorObj;
};

const errorObject = (err, req, errorStatusCode = 500) => {
  const errorObj = {
    name: err instanceof Error ? err.name : 'Error',
    success: false,
    statusCode: errorStatusCode,
    request: {
      ip: req?.ip || null,
      method: req?.method || null,
      url: req?.originalUrl || null,
      correlationId: req?.correlationId || null
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
