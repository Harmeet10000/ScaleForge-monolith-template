import { logger } from './logger.js';

export const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch((err) => {
    logger.error('Async error caught', { meta: { error: err.message, stack: err.stack } });
    next(err);
  });
};
