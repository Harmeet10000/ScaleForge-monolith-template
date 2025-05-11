import { NextFunction } from 'express';
import { logger } from './logger';

export type AsyncHandler<T = unknown, A extends unknown[] = unknown[]> = (...args: A) => Promise<T>;

export function catchAsync<T = unknown, A extends unknown[] = unknown[]>(fn: AsyncHandler<T, A>) {
  return (...args: A) => {
    const lastArg = args[args.length - 1];
    const isNextFunction = typeof lastArg === 'function';

    Promise.resolve(fn(...args)).catch((error) => {
      if (isNextFunction) {
        // For Express or Koa style handlers
        (lastArg as NextFunction)(error);
      } else {
        // For Fastify, Hapi, or custom handlers
        logger.error('Unhandled error:', error);
      }
    });
  };
}
