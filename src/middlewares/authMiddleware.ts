import { Request, Response, NextFunction } from 'express';
import { catchAsync } from '../utils/catchAsync';
import { httpError } from '../utils/httpError';
import jwt from 'jsonwebtoken';
import config from '../config/dotenvConfig';
import { getCache, setCache } from '../helpers/redisFunctions';
import { logger } from '../utils/logger';
import { User } from '../db/models/userModel'; // Import Drizzle User type
import * as authRepository from '../repository/authRepository'; // Import your auth repository

interface AuthRequest extends Request {
  user?: User; // Use Drizzle User type
}

interface JwtPayload {
  userId: string;
  userIp: string;
  iat: number;
  exp: number;
}

export const protect = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthRequest;
    let token;
    const currentIp = req.ip || req.connection.remoteAddress;

    // 1) Check if token is in cookies first
    if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    // 2) If token is not found in cookies, check the Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // 3) If no token is found in either, return an error
    if (!token) {
      return httpError(
        next,
        new Error('You are not logged in! Please log in to get access.'),
        req,
        401
      );
    }

    try {
      const tokenString: string = token;
      const secretKey = config.ACCESS_TOKEN_SECRET;

      if (!secretKey) {
        logger.error('ACCESS_TOKEN_SECRET is not defined in the configuration.');
        return httpError(next, new Error('Internal server configuration error.'), req, 500);
      }

      // 4) Verification token
      const decoded = await new Promise<JwtPayload>((resolve, reject) => {
        jwt.verify(tokenString, secretKey, (err, payload) => {
          if (err) {
            reject(err);
          } else {
            resolve(payload as JwtPayload);
          }
        });
      });
      logger.debug(`Decoded token: ${JSON.stringify(decoded)}, Current IP: ${currentIp}`);

      // Check if IP in token doesn't match the current request IP
      if (decoded.userIp !== currentIp) {
        logger.warn(`IP address mismatch: Token IP=${decoded.userIp}, Request IP=${currentIp}`);
        return httpError(next, new Error('Token is not valid for this IP address.'), req, 401);
      }

      // 5) Check if user exists in cache first
      const cachedUser = (await getCache('user', ['id', decoded.userId])) as User | null;
      let currentUser: User | null = null;

      if (cachedUser) {
        logger.debug(`User found in cache: ${decoded.userId}`);
        currentUser = cachedUser;
      } else {
        // If not in cache, fetch from database using the repository
        currentUser = await authRepository.findUserById(decoded.userId);

        // If user exists, cache it for future requests (30 min expiry)
        if (currentUser) {
          // Drizzle returns plain objects, no .toObject() needed
          await setCache('user', ['id', decoded.userId], currentUser, 1800);
          logger.debug(`User cached: ${decoded.userId}`);
        }
      }

      if (!currentUser) {
        return httpError(
          next,
          new Error('The user belonging to this token no longer exists.'),
          req,
          401
        );
      }

      // 6) Check if user changed password after the token was issued
      // Assuming `passwordReset.lastResetAt` stores the timestamp of the last password change.
      if (
        currentUser.passwordResetLastResetAt &&
        new Date(currentUser.passwordResetLastResetAt).getTime() / 1000 > decoded.iat
      ) {
        return httpError(
          next,
          new Error('User recently changed password! Please log in again.'),
          req,
          401
        );
      }

      // Grant access to protected route
      authReq.user = currentUser;
      next();
    } catch (err) {
      httpError(next, err as Error, req, 401);
    }
  }
);

export const restrictTo =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      return httpError(
        next,
        new Error('You do not have permission to perform this action'),
        req,
        403
      );
    }
    next();
  };
