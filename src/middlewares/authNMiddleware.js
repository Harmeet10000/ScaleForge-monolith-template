import { catchAsync } from '../utils/catchAsync.js';
import { httpError } from '../utils/httpError.js';
import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import { User } from '../models/userModel.js';
import { getHash, setHash } from '../helpers/redisFunctions.js';
import { logger } from '../utils/logger.js';
import {
  NO_PERMISSION,
  NOT_LOGGED_IN,
  TOKEN_INVALID_FOR_IP,
  USER_CHANGED_PASSWORD,
  USER_NO_LONGER_EXISTS
} from '../constants/responseMessage.js';

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
    return httpError(next, new Error(NOT_LOGGED_IN), req, 401);
  }

  // 4) Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.ACCESS_TOKEN_SECRET);
  // logger.debug(`Decoded token: ${JSON.stringify(decoded)}, Current IP: ${currentIp}`);

  // Check if IP in token doesn't match the current request IP
  if (decoded.userIp !== currentIp) {
    logger.warn(`IP address mismatch: Token IP=${decoded.userIp}, Request IP=${currentIp}`);
    return httpError(next, new Error(TOKEN_INVALID_FOR_IP), req, 401);
  }

  // 5) Check if user exists in cache first
  const cachedUser = await getHash('user', `id:${decoded.userId}`);
  let currentUser;

  if (cachedUser) {
    // logger.debug(`User found in cache: ${decoded.userId}`);
    currentUser = cachedUser;
  } else {
    // If not in cache, fetch from database
    const dbUser = await User.findById(decoded.userId);
    currentUser = dbUser;

    // If user exists, cache it for future requests (30 min expiry)
    if (dbUser && !cachedUser) {
      delete dbUser.passwordReset;
      delete dbUser.accountConfirmation;
      delete dbUser.__v;
      await setHash('user', `id:${decoded.userId}`, dbUser.toObject(), 1800);
      // logger.debug(`User cached: ${decoded.userId}`);
    }
  }

  if (!currentUser) {
    return httpError(next, new Error(USER_NO_LONGER_EXISTS), req, 401);
  }

  // 6) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter && currentUser.changedPasswordAfter(decoded.iat)) {
    return httpError(next, new Error(USER_CHANGED_PASSWORD), req, 401);
  }

  // Grant access to protected route
  req.user = currentUser;
  next();
});

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return httpError(next, new Error(NO_PERMISSION), req, 403);
    }
    next();
  };
