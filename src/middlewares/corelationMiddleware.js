import { nanoid } from 'nanoid';

export const correlationIdMiddleware = (req, res, next) => {
  req.correlationId = nanoid();
  next();
};
