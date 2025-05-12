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
import { IDecryptedJwt, ILoginUserRequestBody, IRegisterUserRequestBody } from '../types/userTypes'; // Assuming some request body types might still be relevant
import { User, NewUser } from '../db/models/userModel'; // Import Drizzle types
import { Request, NextFunction } from 'express';
import config from '../config/dotenvConfig';

dayjs.extend(utc);

export const registerUser = async (userData: IRegisterUserRequestBody): Promise<User> => {
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
  const cachedUser = (await getCache('user', ['email', emailAddress])) as User | null;
  if (cachedUser) {
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }

  const existingUser = await authRepository.findUserByEmailAddress(emailAddress);
  if (existingUser) {
    await setCache('user', ['email', emailAddress], existingUser, 3600);
    throw new Error(ALREADY_EXIST('user', emailAddress));
  }

  // * Encrypting Password
  const encryptedPassword = await hashPassword(password);

  // * Account Confirmation Object
  const token = generateRandomId();
  const code = generateOtp(6);

  // * Preparing Object - Ensure this matches NewUser structure
  const payload: NewUser = {
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
    // passwordReset structure might need adjustment based on NewUser
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
    // createdAt and updatedAt are typically handled by Drizzle's defaultNow()
  };

  // Create New User - Assuming authRepository.registerUser now returns Promise<User>
  const newUser = await authRepository.registerUser(payload);

  // newUser is already a plain object from Drizzle
  return newUser;
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

  const updatedAccountConfirmation = {
    ...user.accountConfirmation,
    status: true,
    timestamp: dayjs().utc().toDate()
  };

  // Update the user in the database
  await authRepository.updateUserById(user.id, {
    accountConfirmation: updatedAccountConfirmation
  });

  logger.info(`User ${user.id} account confirmation status updated in DB.`);
  // Simulating update for cache:
  const updatedUserForCache: User = { ...user, accountConfirmation: updatedAccountConfirmation };

  await setCache('user', ['id', user.id.toString()], updatedUserForCache, 1800);
  await setCache('user', ['email', user.emailAddress], updatedUserForCache, 1800);

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
  const { emailAddress, password: plainPassword } = credentials;
  const userIp = req.ip as string;

  let userFromDb = await authRepository.findUserByEmailAddress(emailAddress);

  if (!userFromDb) {
    // Try cache if DB miss (though usually it's cache first)
    const cachedUser = (await getCache('user', ['email', emailAddress])) as User | null;
    if (cachedUser) {
      userFromDb = cachedUser;
    } // Use cached if available
  }

  if (!userFromDb) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }

  // If user was from cache, it might not have password. Fetch from DB to ensure password field is present for comparison.
  // Drizzle typically selects all fields unless specified otherwise.
  // If password field is not directly on userFromDb (e.g. due to select configuration in repo), fetch it.
  // For this example, we assume userFromDb from authRepository.findUserByEmailAddress includes the password.
  // If not, an additional fetch or modification to findUserByEmailAddress to include password is required.

  // if (!userFromDb.password) {
  //    // This case implies password was not selected.
  //     user = {
  //       ...user,
  //   return httpError(next, new Error(INVALID_EMAIL_OR_PASSWORD), req, 400);
  // }

  if (!userFromDb.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  const isValidPassword = await comparePassword(plainPassword, userFromDb.password);
  if (!isValidPassword) {
    return httpError(next, new Error(INVALID_EMAIL_OR_PASSWORD), req, 400);
  }

  const userId = userFromDb.id.toString();
  const accessToken = generateToken(
    { userId, userIp },
    config.ACCESS_TOKEN_SECRET || 'access-token-secret',
    config.ACCESS_TOKEN_EXPIRY || 3600
  );
  const refreshToken = generateToken(
    { userId, userIp },
    config.REFRESH_TOKEN_SECRET || 'refresh-token-secret',
    config.REFRESH_TOKEN_EXPIRY || 604800
  );

  const lastLoginAt = dayjs().utc().toDate();
  // Replace userDocument.save() with an update operation
  // Example: await authRepository.updateUserById(userId, { lastLoginAt });
  logger.info(`User ${userId} lastLoginAt to be updated in DB.`);
  // Simulating update for cache:
  const updatedUserForCache: User = { ...userFromDb, lastLoginAt };

  await setCache('user', ['email', emailAddress], updatedUserForCache, 1800);
  await setCache('user', ['id', userId], updatedUserForCache, 1800);

  await tokenRepository.createRefreshToken({ token: refreshToken });

  const domain = getDomainFromUrl(config.SERVER_URL);

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

  const domain = getDomainFromUrl(config.SERVER_URL);
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

  await authRepository.updateUserById(user.id, { passwordReset: user.passwordReset });

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
  await authRepository.updateUserById(user.id, {
    password: user.password,
    passwordReset: user.passwordReset
  });

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
  await authRepository.updateUserById(user.id, { password: user.password });

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
