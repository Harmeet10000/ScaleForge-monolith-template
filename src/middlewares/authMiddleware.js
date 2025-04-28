import { catchAsync } from '../utils/catchAsync.js';
import { httpError } from '../utils/httpError.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { User } from '../models/userModel.js';
import { getCache, setCache } from '../helpers/redisFunctions.js';
import { logger } from '../utils/logger.js';

export const protect = catchAsync(async (req, res, next) => {
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
    // 4) Verification token
    const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);
    logger.debug(`Decoded token: ${JSON.stringify(decoded)}, Current IP: ${currentIp}`);

    // Check if IP in token doesn't match the current request IP
    if (decoded.userIp === currentIp) {
      logger.warn(`IP address mismatch: Token IP=${decoded.userIp}, Request IP=${currentIp}`);
      return httpError(next, new Error('Token is not valid for this IP address.'), req, 401);
    }

    // 5) Check if user exists in cache first
    const cachedUser = await getCache('user', ['id', decoded.userId]);
    let currentUser;

    if (cachedUser) {
      logger.debug(`User found in cache: ${decoded.userId}`);
      currentUser = cachedUser;
    } else {
      // If not in cache, fetch from database
      currentUser = await User.findById(decoded.userId);

      // If user exists, cache it for future requests (30 min expiry)
      if (currentUser) {
        await setCache('user', ['id', decoded.userId], currentUser.toObject(), 1800);
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
    if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
      return httpError(
        next,
        new Error('User recently changed password! Please log in again.'),
        req,
        401
      );
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (err) {
    httpError(next, err, req, 401);
  }
});

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return httpError(
        next,
        new Error('You do not have permission to perform this action'),
        req,
        403
      );
    }
    next();
  };
