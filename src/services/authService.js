import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
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
} from '../helpers/generalHelper.js';
import { sendEmail } from '../helpers/email.js';
import { logger } from '../utils/logger.js';
import { httpError } from '../utils/httpError.js';
import { EUserRole } from '../constant/application.js';
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
} from '../constant/responseMessage.js';
import * as authRepository from '../repository/authRepository.js';
import * as tokenRepository from '../repository/tokenRepository.js';
import { deleteCache, getCache, setCache } from '../helpers/redisFunctions.js';

dayjs.extend(utc);

export const registerUser = async (userData) => {
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
  const payload = {
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

  // * Send Email
  const confirmationUrl = `${process.env.FRONTEND_URL}/confirmation/${token}?code=${code}`;
  const to = [emailAddress];
  const subject = 'Confirm Your Account';
  const text = `Hey ${name}, Please confirm your account by clicking on the link below\n\n${confirmationUrl}`;

  sendEmail(to, subject, text).catch((err) => {
    logger.error(`EMAIL_SERVICE`, {
      meta: err
    });
  });

  return newUser;
};

export const confirmAccount = async (token, code, req, next) => {
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
  await setCache('user', ['id', user._id], user.toObject(), 1800);
  await setCache('user', ['email', user.emailAddress], user.toObject(), 1800);

  // * Account Confirmation Email
  const to = [user.emailAddress];
  const subject = 'Account Confirmed';
  const text = `Your account has been confirmed`;

  sendEmail(to, subject, text).catch((err) => {
    logger.error(`EMAIL_SERVICE`, {
      meta: err
    });
  });

  return true;
};

export const loginUser = async (credentials, req, next) => {
  const { emailAddress, password } = credentials;
  const userIp = req.ip;

  // Check cache for user first
  let user = await getCache('user', ['email', emailAddress]);

  // If not in cache, fetch from database
  if (!user) {
    user = await authRepository.findUserByEmailAddress(emailAddress, `+password`);

    // If user exists, store in cache for future requests
    if (user) {
      // Don't store the user with password in cache for security
      const userForCache = { ...user.toObject() };
      delete userForCache.password;
      await setCache('user', ['email', emailAddress], userForCache, 1800);
      await setCache('user', ['id', user._id], userForCache, 1800);
    }
  } else {
    // If found in cache, get the password from DB for validation
    const userWithPassword = await authRepository.findUserByEmailAddress(emailAddress, `+password`);
    if (userWithPassword) {
      user.password = userWithPassword.password;
    }
  }

  if (!user) {
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
      userId: user.id || user._id, // Handle both object and plain object
      userIp
    },
    process.env.ACCESS_TOKEN_SECRET,
    3600
  );
  const refreshToken = generateToken(
    {
      userId: user.id || user._id,
      userIp
    },
    process.env.REFRESH_TOKEN_SECRET,
    3600
  );

  // * Last Login Information
  if (typeof user.save === 'function') {
    user.lastLoginAt = dayjs().utc().toDate();
    await user.save();

    // Update user in cache with new lastLoginAt
    const userForCache = { ...user.toObject() };
    delete userForCache.password;
    await setCache('user', ['email', emailAddress], userForCache, 1800);
    await setCache('user', ['id', user._id], userForCache, 1800);
  } else {
    // If user is from cache and doesn't have save method
    await authRepository.updateUserLastLogin(user._id);

    // Update cache with new login time
    user.lastLoginAt = dayjs().utc().toDate();
    await setCache('user', ['email', emailAddress], user, 1800);
    await setCache('user', ['id', user._id], user, 1800);
  }

  // * Refresh Token Store
  const refreshTokenPayload = {
    token: refreshToken
  };

  await tokenRepository.createRefreshToken(refreshTokenPayload);

  // * Get domain for cookies
  const domain = getDomainFromUrl(process.env.SERVER_URL);

  return {
    accessToken,
    refreshToken,
    domain
  };
};

export const logoutUser = async (refreshToken) => {
  logger.info('Logout called with refresh:', refreshToken);
  if (refreshToken) {
    try {
      // Get user ID from refresh token
      const decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

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

export const refreshUserToken = async (refreshToken, req, next) => {
  if (!refreshToken) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  // fetch token from db
  const rft = await tokenRepository.findRefreshToken(refreshToken);
  if (!rft) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  const domain = getDomainFromUrl(process.env.SERVER_URL);
  let userId = null;

  try {
    const decryptedJwt = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
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
    process.env.ACCESS_TOKEN_SECRET,
    process.env.ACCESS_TOKEN_EXPIRY
  );

  return {
    newAccessToken,
    domain
  };
};

export const requestPasswordReset = async (emailAddress, req, next) => {
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
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const to = [emailAddress];
  const subject = 'Account Password Reset Requested';
  const text = `Hey ${user.name}, Please reset your account password by clicking on the link below\n\nLink will expire within 15 Minutes\n\n${resetUrl}`;

  sendEmail(to, subject, text).catch((err) => {
    logger.error(`EMAIL_SERVICE`, {
      meta: err
    });
  });

  return true;
};

export const resetUserPassword = async (token, newPassword, req, next) => {
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
  const to = [user.emailAddress];
  const subject = 'Account Password Reset';
  const text = `Hey ${user.name}, You account password has been reset successfully.`;

  sendEmail(to, subject, text).catch((err) => {
    logger.error(`EMAIL_SERVICE`, {
      meta: err
    });
  });

  return true;
};

export const changeUserPassword = async (userId, oldPassword, newPassword, req, next) => {
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
  const to = [user.emailAddress];
  const subject = 'Password Changed';
  const text = `Hey ${user.name}, You account password has been changed successfully.`;

  sendEmail(to, subject, text).catch((err) => {
    logger.error(`EMAIL_SERVICE`, {
      meta: err
    });
  });

  return true;
};
