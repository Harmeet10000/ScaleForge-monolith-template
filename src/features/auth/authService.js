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
} from '../../helpers/generalHelper.js';
import { Resendmail } from '../../helpers/email.js';
import { logger } from '../../utils/logger.js';
import { httpError } from '../../utils/httpError.js';
import {
  ACCOUNT_ALREADY_CONFIRMED,
  ACCOUNT_CONFIRMATION_REQUIRED,
  ALREADY_EXIST,
  EXPIRED_URL,
  INVALID_ACCOUNT_CONFIRMATION_EMAIL_OR_CODE,
  INVALID_EMAIL_OR_PASSWORD,
  INVALID_OLD_PASSWORD,
  INVALID_PHONE_NUMBER,
  INVALID_REQUEST,
  INVALID_TIMEZONE,
  NOT_FOUND,
  PASSWORD_MATCHING_WITH_OLD_PASSWORD,
  UNAUTHORIZED
} from './authConstants.js';
import { EUserRole } from '../../helpers/application.js';
import * as authRepository from './authRepository.js';
import * as tokenRepository from './tokenRepository.js';
import { deleteHash, getHash, setHash } from '../../helpers/cache/redisFunctions.js';
import asyncHandler from 'express-async-handler';

dayjs.extend(utc);

export const registerUser = asyncHandler(async (userData, req, next) => {
  const { name, emailAddress, password, phoneNumber, consent } = userData;

  const { countryCode, isoCode, internationalNumber } = extractInfoPhoneNumber(`+${phoneNumber}`);
  if (!countryCode || !isoCode || !internationalNumber) {
    return httpError(next, new Error(INVALID_PHONE_NUMBER), req, 404);
  }

  const timezone = countryTimezone(isoCode);
  if (!timezone || timezone.length === 0) {
    return httpError(next, new Error(INVALID_TIMEZONE), req, 404);
  }

  const cachedUser = await getHash('user', `email:${emailAddress}`);
  if (cachedUser) {
    return httpError(next, new Error(ALREADY_EXIST('user', emailAddress)), req, 409);
  }

  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (user) {
    await setHash('user', `email:${emailAddress}`, user.toObject(), 1800);
    return httpError(next, new Error(ALREADY_EXIST('user', emailAddress)), req, 409);
  }

  const encryptedPassword = await hashPassword(password);
  const token = generateRandomId();
  const code = generateOtp(6);

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

  const newUser = await authRepository.registerUser(payload);

  const confirmationUrl = `${process.env.FRONTEND_URL}/confirmation/${emailAddress}?code=${code}`;
  const info = {
    to: [emailAddress],
    subject: 'Confirm Your Account',
    name,
    confirmationUrl,
    code,
    purpose: 'accountConfirmation'
  };

  Resendmail(info);

  return newUser;
});

export const confirmAccount = asyncHandler(async (emailAddress, code, req, next) => {
  // Find user by email
  const user = await authRepository.findUserByEmailAddress(emailAddress);
  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }
  logger.debug('User for account confirmation', { meta: { user } });
  // Match code in DB
  if (user.accountConfirmation.code !== code) {
    // CWE-208: Use of Timing Attack Resistant Comparison
    //if (!crypto.timingSafeEqual(Buffer.from(user.accountConfirmation.code || ''), Buffer.from(code || ''))) {
    return httpError(next, new Error(INVALID_ACCOUNT_CONFIRMATION_EMAIL_OR_CODE), req, 400);
  }

  if (user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_ALREADY_CONFIRMED), req, 400);
  }

  user.accountConfirmation.status = true;
  user.accountConfirmation.timestamp = dayjs().utc().toDate();
  user.accountConfirmation.token = null;
  user.accountConfirmation.code = null;
  await user.save();

  const info = {
    to: [user.emailAddress],
    subject: 'Account Confirmed',
    name: user.name,
    purpose: 'confirmationSuccess'
  };

  Resendmail(info);

  return true;
});

export const loginUser = asyncHandler(async (credentials, req, next) => {
  const { emailAddress, password } = credentials;
  const userIp = req.ip;

  let user = await getHash('user', `email:${emailAddress}`);
  // logger.debug(`User from cache:`, { meta: { user } });
  if (!user) {
    user = await authRepository.findUserByEmailAddress(emailAddress, `+password`);
  }
  // logger.debug('user', { meta: { user } });

  if (!user) {
    return httpError(next, new Error(NOT_FOUND('user')), req, 404);
  }
  if (!user.accountConfirmation.status) {
    return httpError(next, new Error(ACCOUNT_CONFIRMATION_REQUIRED), req, 400);
  }

  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    return httpError(next, new Error(INVALID_EMAIL_OR_PASSWORD), req, 400);
  }

  const accessToken = generateToken(
    {
      userId: user.id || user._id,
      role: user.role,
      userIp
    },
    process.env.ACCESS_TOKEN_SECRET,
    3600
  );
  const refreshToken = generateToken(
    {
      userId: user.id || user._id,
      role: user.role,
      userIp
    },
    process.env.REFRESH_TOKEN_SECRET,
    604800
  );

  await authRepository.updateUserLastLogin(user._id);
  user.lastLoginAt = dayjs().utc().toDate();
  const userForResponse = user.toObject ? user.toObject() : { ...user };
  delete userForResponse.passwordReset;
  delete userForResponse.__v;
  await setHash('user', `email:${emailAddress}`, userForResponse, 1800);
  await setHash('user', `id:${user._id}`, userForResponse, 1800);

  const refreshTokenPayload = {
    token: refreshToken
  };

  await tokenRepository.createRefreshToken(refreshTokenPayload);

  const domain = getDomainFromUrl(process.env.SERVER_URL);
  delete userForResponse.accountConfirmation;
  delete userForResponse.password;
  delete userForResponse.consent;
  delete userForResponse.createdAt;
  delete userForResponse.updatedAt;

  return {
    accessToken,
    refreshToken,
    userForResponse,
    domain
  };
});

export const logoutUser = asyncHandler(async (refreshToken) => {
  // logger.info('Logout called with refresh');
  if (refreshToken) {
    // Get user ID from refresh token
    const decoded = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    if (decoded && decoded.userId) {
      // Remove user from cache when logging out
      await deleteHash('user', `id:${decoded.userId}`);
    }

    // Delete the refresh token from database
    await tokenRepository.deleteRefreshToken(refreshToken);
  }
  return true;
});

export const refreshUserToken = asyncHandler(async (refreshToken, req, next) => {
  if (!refreshToken) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  // fetch token from db
  const rft = await tokenRepository.findRefreshToken(refreshToken);
  if (!rft) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  const domain = getDomainFromUrl(process.env.SERVER_URL);
  let userId,
    role = null;

  try {
    const decryptedJwt = verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    ({ userId, role } = decryptedJwt);
  } catch (err) {
    logger.error('Error in refresh token:', err);
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  if (!userId) {
    return httpError(next, new Error(UNAUTHORIZED), req, 401);
  }

  // * Generate new Access Token
  const newAccessToken = generateToken(
    {
      userId,
      role,
      userIp: req.ip
    },
    process.env.ACCESS_TOKEN_SECRET,
    3600
  );

  return {
    newAccessToken,
    domain
  };
});

export const requestPasswordReset = asyncHandler(async (emailAddress, req, next) => {
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

  const info = {
    to: [emailAddress],
    subject: 'Account Password Reset Requested',
    name: user.name,
    resetUrl,
    confirmationUrl: resetUrl,
    purpose: 'requestPasswordReset'
  };

  Resendmail(info);

  return true;
});

export const resetUserPassword = asyncHandler(async (token, newPassword, req, next) => {
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

  const info = {
    to: [user.emailAddress],
    subject: 'Account Password Reset',
    name: user.name,
    purpose: 'resetUserPassword'
  };

  Resendmail(info);
  return true;
});

export const changeUserPassword = asyncHandler(
  async (userId, oldPassword, newPassword, req, next) => {
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
      // CWE-208: Use of Timing Attack Resistant Comparison
      //if (!crypto.timingSafeEqual(Buffer.from(newPassword || ''), Buffer.from(oldPassword || ''))) {

      return httpError(next, new Error(PASSWORD_MATCHING_WITH_OLD_PASSWORD), req, 400);
    }

    // Password hash for new password
    const hashedPassword = await hashPassword(newPassword);

    // User update
    user.password = hashedPassword;
    await user.save();

    // Email Send

    const info = {
      to: [user.emailAddress],
      subject: 'Password Changed',
      name: user.name,
      purpose: 'changeUserPassword'
    };

    Resendmail(info);

    return true;
  }
);

export const googleOAuthSignup = asyncHandler(async (payload, req, next) => {
  const { id, email, name, picture } = payload;
  // Check if user already exists
  let user = await authRepository.findUserByEmailAddress(email);
  if (user) {
    // logger.warn('Google OAuth signup attempted for existing user', { meta: { email } });
    return httpError(next, new Error('User already exists'), req, 409);
  }
  // Register new user
  const newUserPayload = {
    name,
    emailAddress: email,
    provider: 'google',
    oauth_id: id,
    image: picture,
    role: EUserRole.USER,
    accountConfirmation: { status: true, token: null, code: null, timestamp: new Date() },
    consent: true,
    timezone: 'UTC',
    password: null
  };
  user = await authRepository.registerUser(newUserPayload);
  // Generate tokens
  const userIp = req.ip;
  const accessToken = generateToken(
    { userId: user._id, userIp },
    process.env.ACCESS_TOKEN_SECRET,
    3600
  );
  const refreshToken = generateToken(
    { userId: user._id, userIp },
    process.env.REFRESH_TOKEN_SECRET,
    3600
  );
  const domain = getDomainFromUrl(process.env.SERVER_URL);

  return { accessToken, refreshToken, domain };
});

export const googleOAuthLogin = asyncHandler(async (payload, req, next) => {
  const { id, email } = payload;
  // Find user by email and oauth_id
  const user = await authRepository.findUserByEmailAddress(email);
  if (!user || user.oauth_id !== id) {
    // logger.warn('Google OAuth login failed', { meta: { email, id } });
    return httpError(next, new Error('Invalid Google OAuth credentials'), req, 401);
  }
  // logger.info('Google OAuth login successful', { meta: { userId: user._id, email } });
  // Generate tokens
  const userIp = req.ip;
  const accessToken = generateToken(
    { userId: user._id, userIp },
    process.env.ACCESS_TOKEN_SECRET,
    3600
  );
  const refreshToken = generateToken(
    { userId: user._id, userIp },
    process.env.REFRESH_TOKEN_SECRET,
    3600
  );
  const domain = getDomainFromUrl(process.env.SERVER_URL);

  return { accessToken, refreshToken, domain };
});
