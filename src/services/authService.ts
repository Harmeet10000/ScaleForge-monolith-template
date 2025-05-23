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

export const generateAuthTokens = (user: IUserDocument | IUserWithId) => {
  const userIp = 'unknown';
  const userId = typeof user._id === 'string' ? user._id : user._id.toString();

  const accessToken = generateToken(
    {
      userId,
      userIp
    },
    config.ACCESS_TOKEN_SECRET || 'access-token-secret',
    config.ACCESS_TOKEN_EXPIRY || 3600
  );
  const refreshToken = generateToken(
    {
      userId,
      userIp
    },
    config.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
    config.REFRESH_TOKEN_EXPIRY || 604800
  );
  return { accessToken, refreshToken };
};

export const registerUser = async (userData: IRegisterUserRequestBody): Promise<IUserWithId> => {
  const { name, emailAddress, password, phoneNumber, consent } = userData;

  const { countryCode, isoCode, internationalNumber } = extractInfoPhoneNumber(`+${phoneNumber}`);
  if (!countryCode || !isoCode || !internationalNumber) {
    throw new Error(INVALID_PHONE_NUMBER);
  }

  const timezone = countryTimezone(isoCode);
  if (!timezone || timezone.length === 0) {
    throw new Error(INVALID_TIMEZONE);
  }

  const cachedUser = await getCache('user', ['email', emailAddress]);
  if (cachedUser) {
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (user) {
    await setCache('user', ['email', emailAddress], user.toObject(), 3600);
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }

  const encryptedPassword = await hashPassword(password);

  const token = generateRandomId();
  const code = generateOtp(6);

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

  const newUser = await authRepository.registerUser(payload);

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
  const user = await authRepository.findUserByConfirmationTokenAndCode(token, code);
  if (!user) {
    return httpError(next, new Error(INVALID_ACCOUNT_CONFIRMATION_TOKEN_OR_CODE), req, 400);
  }

  if (user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_ALREADY_CONFIRMED), req, 400);
  }

  user.accountConfirmation.status = true;
  user.accountConfirmation.timestamp = dayjs().utc().toDate();

  await user.save();

  await setCache('user', ['id', user._id.toString()], user.toObject(), 1800);
  await setCache('user', ['email', user.emailAddress], user.toObject(), 1800);

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
  // const userIp = req.ip as string;

  let user = (await getCache('user', ['email', emailAddress])) as IUserWithId | null;
  let userDocument: IUserDocument | null = null;

  if (!user) {
    userDocument = await authRepository.findUserByEmailAddress(emailAddress, `+password`);

    if (userDocument) {
      user = userDocument.toObject();
    }
  } else {
    // user = userDocument ? userDocument.toObject() : user;
  }

  if (!user || !userDocument || !user.password) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return httpError(next, new Error(INVALID_EMAIL_OR_PASSWORD), req, 400);
  }

  const { accessToken, refreshToken } = generateAuthTokens(userDocument);

  userDocument.lastLoginAt = dayjs().utc().toDate();
  await userDocument.save();

  const userForCache = userDocument.toObject();
  delete userForCache.password;
  await setCache('user', ['email', emailAddress], userForCache, 1800);
  await setCache('user', ['id', userDocument._id.toString()], userForCache, 1800);

  const refreshTokenPayload = {
    token: refreshToken
  };

  await tokenRepository.createRefreshToken(refreshTokenPayload);

  const domain = getDomainFromUrl(config.SERVER_URL);

  return {
    accessToken,
    refreshToken,
    domain
  };
};

export const logoutUser = async (refreshToken: string): Promise<boolean> => {
  if (refreshToken) {
    try {
      const decoded = verifyToken(
        refreshToken,
        config.REFRESH_TOKEN_SECRET || 'refresh-token-secret'
      ) as IDecryptedJwt;

      if (decoded && decoded.userId) {
        await deleteCache('user', ['id', decoded.userId]);
      }

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

  const rft = await tokenRepository.findRefreshToken(refreshToken);
  if (!rft) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  const domain = getDomainFromUrl(config.SERVER_URL);
  let userId: string | null = null;

  try {
    const decryptedJwt = verifyToken(
      refreshToken,
      config.REFRESH_TOKEN_SECRET || 'refresh-token-secret'
    ) as IDecryptedJwt;
    ({ userId } = decryptedJwt);
  } catch (err) {
    logger.error('Error in refreshUserToken:', err);
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  if (!userId) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

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
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  const token = generateRandomId();
  const expiry = generateResetPasswordExpiry(15);

  user.passwordReset.token = token;
  user.passwordReset.expiry = expiry;

  await user.save();

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
  const user = await authRepository.findByResetToken(token);
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  const storedExpiry = user.passwordReset.expiry;
  const currentTimestamp = dayjs().valueOf();

  if (!storedExpiry) {
    return httpError(next, new Error(INVALID_REQUEST), req, 400);
  }

  if (currentTimestamp > storedExpiry) {
    return httpError(next, new Error(EXPIRED_URL), req, 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;
  user.passwordReset.token = null;
  user.passwordReset.expiry = null;
  user.passwordReset.lastResetAt = dayjs().utc().toDate();
  await user.save();

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
  const user = await authRepository.findUserById(userId, '+password');
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  const isPasswordMatching = await comparePassword(oldPassword, user.password);
  if (!isPasswordMatching) {
    return httpError(next, new Error(INVALID_OLD_PASSWORD), req, 400);
  }

  if (newPassword === oldPassword) {
    return httpError(next, new Error(PASSWORD_MATCHING_WITH_OLD_PASSWORD), req, 400);
  }

  const hashedPassword = await hashPassword(newPassword);

  user.password = hashedPassword;
  await user.save();

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
