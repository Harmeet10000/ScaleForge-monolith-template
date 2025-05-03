import { Request, Response, NextFunction } from 'express';

export const catchAsync = <T = unknown>(
  // eslint-disable-next-line no-unused-vars
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res, next).catch((err) => {
    next(err);
  });
};
