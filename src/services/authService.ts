import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import {
  comparePassword,
  countryTimezone,
  extractInfoPhoneNumber,
  generateOtp,
  generateRandomId,
  generateResetPasswordExpiry,
  generateToken,
  getDomainFromUrl,
  hashPassword,
  verifyToken
} from '../helpers/generalHelper';
import { sendEmail } from '../helpers/email';
import { logger } from '../utils/logger';
import { httpError } from '../utils/httpError';
import { EUserRole } from '../constant/application';
import {
  ACCOUNT_ALREADY_CONFIRMED,
  ACCOUNT_CONFIRMATION_REQUIRED,
  ALREADY_EXIST,
  EXPIRED_URL,
  INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE,
  INVALID_EMAIL_OR_PASSWORD,
  INVALID_OLD_PASSWORD,
  INVALID_PHONE_NUMBER,
  INVALID_REQUEST,
  INVALID_TIMEZONE,
  NOT_FOUND,
  PASSWORD_MATCHING_WITH_OLD_PASSWORD,
  UNAUTHORIZED
} from '../constant/responseMessage';
import * as authRepository from '../repository/authRepository';
import * as tokenRepository from '../repository/tokenRepository';
import { deleteCache, getCache, setCache } from '../helpers/redisFunctions';
import {
  IDecryptedJwt,
  ILoginUserRequestBody,
  IRegisterUserRequestBody,
  IUser,
  IUserWithId,
  IUserDocument
} from '../types/userTypes';
import { Request, NextFunction } from 'express';
import config from '../config/dotenvConfig';

dayjs.extend(utc);

export const registerUser = async (userData: IRegisterUserRequestBody): Promise<IUserWithId> => {
  const { name, emailAddress, password, phoneNumber, consent } = userData;

  // * Phone Number Validation & Parsing
  const { countryCode, isoCode, internationalNumber } = extractInfoPhoneNumber(`+${phoneNumber}`);

  if (!countryCode || !isoCode || !internationalNumber) {
    throw new Error(INVALID_PHONE_NUMBER);
  }

  // * Timezone
  const timezone = countryTimezone(isoCode);

  if (!timezone || timezone.length === 0) {
    throw new Error(INVALID_TIMEZONE);
  }

  // * Check User Existence using Email Address
  // First check cache for this email
  const cachedUser = await getCache('user', ['email', emailAddress]);
  if (cachedUser) {
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }

  // If not in cache, check database
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (user) {
    // Cache user for future checks
    await setCache('user', ['email', emailAddress], user.toObject(), 3600);
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }

  // * Encrypting Password
  const encryptedPassword = await hashPassword(password);

  // * Account Confirmation Object
  const token = generateRandomId();
  const code = generateOtp(6);

  // * Preparing Object
  const payload: IUser = {
    name,
    emailAddress,
    phoneNumber: {
      countryCode,
      isoCode,
      internationalNumber
    },
    accountConfirmation: {
      status: false,
      token,
      code,
      timestamp: null
    },
    passwordReset: {
      token: null,
      expiry: null,
      lastResetAt: null
    },
    lastLoginAt: null,
    role: EUserRole.USER,
    timezone: timezone[0].name,
    password: encryptedPassword,
    consent
  };

  // Create New User
  const newUser = await authRepository.registerUser(payload);

  // Return without converting _id to string since IUserWithId now expects ObjectId
  return {
    ...newUser.toObject()
  };
};

export const confirmAccount = async (
  token: string,
  code: string,
  req: Request,
  next: NextFunction
): Promise<boolean | void> => {
  // * Fetch User By Token & Code
  const user = await authRepository.findUserByConfirmationTokenAndCode(token, code);
  if (!user) {
    return httpError(next, new Error(INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE), req, 400);
  }

  // * Check if Account already confirmed
  if (user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_ALREADY_CONFIRMED), req, 400);
  }

  // * Account confirm
  user.accountConfirmation.status = true;
  user.accountConfirmation.timestamp = dayjs().utc().toDate();

  await user.save();

  // Update user in cache to reflect confirmation
  await setCache('user', ['id', user._id.toString()], user.toObject(), 1800);
  await setCache('user', ['email', user.emailAddress], user.toObject(), 1800);

  // * Account Confirmation Email
  const subject = 'Account Confirmed';
  const text = `Your account has been confirmed`;

  try {
    await sendEmail([user.emailAddress], subject, text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`EMAIL_SERVICE`, {
      meta: error
    });
  }

  return true;
};

export const loginUser = async (
  credentials: ILoginUserRequestBody,
  req: Request,
  next: NextFunction
): Promise<{ accessToken: string; refreshToken: string; domain: string } | void> => {
  const { emailAddress, password } = credentials;
  const userIp = req.ip as string;

  // Check cache for user first
  let user = (await getCache('user', ['email', emailAddress])) as IUserWithId | null;
  let userDocument: IUserDocument | null = null;

  // If not in cache, fetch from database
  if (!user) {
    userDocument = await authRepository.findUserByEmailAddress(emailAddress, `+password`);

    // If user exists, store in cache for future requests
    if (userDocument) {
      // Don't store the user with password in cache for security
      const userForCache = userDocument.toObject();
      delete userForCache.password;
      await setCache('user', ['email', emailAddress], userForCache, 1800);
      await setCache('user', ['id', userDocument._id.toString()], userForCache, 1800);
      user = userForCache;
    }
  } else {
    // If found in cache, get the password from DB for validation
    userDocument = await authRepository.findUserByEmailAddress(emailAddress, `+password`);
    if (userDocument) {
      user = {
        ...user,
        password: userDocument.password
      };
    }
  }

  if (!user || !userDocument || !user.password) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  // * Check if user account is confirmed
  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  // * Validate Password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return httpError(next, new Error(INVALID_EMAIL_OR_PASSWORD), req, 400);
  }

  // * Access Token & Refresh Token
  const accessToken = generateToken(
    {
      userId: userDocument._id.toString(),
      userIp
    },
    config.ACCESS_TOKEN_SECRET || 'access-token-secret',
    3600
  );
  const refreshToken = generateToken(
    {
      userId: userDocument._id.toString(),
      userIp
    },
    config.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
    3600
  );

  // * Last Login Information
  userDocument.lastLoginAt = dayjs().utc().toDate();
  await userDocument.save();

  // Update user in cache with new lastLoginAt
  const userForCache = userDocument.toObject();
  delete userForCache.password;
  await setCache('user', ['email', emailAddress], userForCache, 1800);
  await setCache('user', ['id', userDocument._id.toString()], userForCache, 1800);

  // * Refresh Token Store
  const refreshTokenPayload = {
    token: refreshToken
  };

  await tokenRepository.createRefreshToken(refreshTokenPayload);

  // * Get domain for cookies
  const domain = getDomainFromUrl(config.SERVER_URL || 'http://localhost:3000');

  return {
    accessToken,
    refreshToken,
    domain
  };
};

export const logoutUser = async (refreshToken: string): Promise<boolean> => {
  logger.info('Logout called with refresh:', refreshToken);
  if (refreshToken) {
    try {
      // Get user ID from refresh token
      const decoded = verifyToken(
        refreshToken,
        config.REFRESH_TOKEN_SECRET || 'refresh-token-secret'
      ) as IDecryptedJwt;

      if (decoded && decoded.userId) {
        // Remove user from cache when logging out
        await deleteCache('user', ['id', decoded.userId]);
      }

      // Delete the refresh token from database
      await tokenRepository.deleteRefreshToken(refreshToken);
    } catch (err) {
      logger.error('Error in logout:', err);
    }
  }
  return true;
};

export const refreshUserToken = async (
  refreshToken: string,
  req: Request,
  next: NextFunction
): Promise<{ newAccessToken: string; domain: string } | void> => {
  if (!refreshToken) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  // fetch token from db
  const rft = await tokenRepository.findRefreshToken(refreshToken);
  if (!rft) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  const domain = getDomainFromUrl(config.SERVER_URL || 'http://localhost:3000');
  let userId: string | null = null;

  try {
    const decryptedJwt = verifyToken(
      refreshToken,
      config.REFRESH_TOKEN_SECRET || 'refresh-token-secret'
    ) as IDecryptedJwt;
    userId = decryptedJwt.userId;
  } catch (err) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  if (!userId) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  // * Generate new Access Token
  const newAccessToken = generateToken(
    {
      userId,
      userIp: req.ip
    },
    config.ACCESS_TOKEN_SECRET || 'access-token-secret',
    config.ACCESS_TOKEN_EXPIRY || 3600
  );

  return {
    newAccessToken,
    domain
  };
};

export const requestPasswordReset = async (
  emailAddress: string,
  req: Request,
  next: NextFunction
): Promise<boolean | void> => {
  // Find User by Email Address
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  // Check if user account is confirmed
  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  // Password Reset token & expiry
  const token = generateRandomId();
  const expiry = generateResetPasswordExpiry(15);

  // Update User
  user.passwordReset.token = token;
  user.passwordReset.expiry = expiry;

  await user.save();

  // Send Email
  const resetUrl = `${config.FRONTEND_URL}/reset-password/${token}`;
  const subject = 'Account Password Reset Requested';
  const text = `Hey ${user.name}, Please reset your account password by clicking on the link below\n\nLink will expire within 15 Minutes\n\n${resetUrl}`;

  try {
    await sendEmail([emailAddress], subject, text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`EMAIL_SERVICE`, {
      meta: error
    });
  }

  return true;
};

export const resetUserPassword = async (
  token: string,
  newPassword: string,
  req: Request,
  next: NextFunction
): Promise<boolean | void> => {
  // Fetch user by token
  const user = await authRepository.findByResetToken(token);
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  // Check if user account is confirmed
  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  // Check expiry of the url
  const storedExpiry = user.passwordReset.expiry;
  const currentTimestamp = dayjs().valueOf();

  if (!storedExpiry) {
    return httpError(next, new Error(INVALID_REQUEST), req, 400);
  }

  if (currentTimestamp > storedExpiry) {
    return httpError(next, new Error(EXPIRED_URL), req, 400);
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // User update
  user.password = hashedPassword;
  user.passwordReset.token = null;
  user.passwordReset.expiry = null;
  user.passwordReset.lastResetAt = dayjs().utc().toDate();
  await user.save();

  // Email send
  const subject = 'Account Password Reset';
  const text = `Hey ${user.name}, You account password has been reset successfully.`;

  try {
    await sendEmail([user.emailAddress], subject, text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`EMAIL_SERVICE`, {
      meta: error
    });
  }

  return true;
};

export const changeUserPassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string,
  req: Request,
  next: NextFunction
): Promise<boolean | void> => {
  // Find User by id
  const user = await authRepository.findUserById(userId, '+password');
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  // Check if old password is matching with stored password
  const isPasswordMatching = await comparePassword(oldPassword, user.password);
  if (!isPasswordMatching) {
    return httpError(next, new Error(INVALID_OLD_PASSWORD), req, 400);
  }

  if (newPassword === oldPassword) {
    return httpError(next, new Error(PASSWORD_MATCHING_WITH_OLD_PASSWORD), req, 400);
  }

  // Password hash for new password
  const hashedPassword = await hashPassword(newPassword);

  // User update
  user.password = hashedPassword;
  await user.save();

  // Email Send
  const subject = 'Password Changed';
  const text = `Hey ${user.name}, You account password has been changed successfully.`;

  try {
    await sendEmail([user.emailAddress], subject, text);
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(`EMAIL_SERVICE`, {
      meta: error
    });
  }

  return true;
};
