import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import {
  validateJoiSchema,
  validateRegisterBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateChangePasswordBody,
  validateGoogleLogin,
  validateGoogleSignup
} from './authValidation.js';
import * as authService from './authService.js';
import { getDomainFromUrl } from '../../helpers/generalHelper.js';
import asyncHandler from 'express-async-handler';
import { EApplicationEnvironment } from '../../helpers/application.js';
import {
  GOOGLE_OAUTH_LOGIN_SUCCESS,
  GOOGLE_OAUTH_SIGNUP_SUCCESS,
  SUCCESS
} from './authConstants.js';

export const register = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateRegisterBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const newUser = await authService.registerUser(value);
  httpResponse(req, res, 201, SUCCESS, { _id: newUser._id });
});

export const confirmation = asyncHandler(async (req, res, next) => {
  await authService.confirmAccount(req.params.email, req.query.code, req, next);
  httpResponse(req, res, 200, SUCCESS);
});

export const login = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateLoginBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { accessToken, refreshToken, userForResponse, domain } = await authService.loginUser(
    value,
    req,
    next
  );
  res
    .cookie('accessToken', accessToken, {
      path: '/api/v1',
      domain,
      sameSite: 'strict',
      maxAge: 1000 * 3600,
      httpOnly: true,
      secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    })
    .cookie('refreshToken', refreshToken, {
      path: '/api/v1',
      domain,
      sameSite: 'strict',
      maxAge: 1000 * 3600,
      httpOnly: true,
      secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    });

  httpResponse(req, res, 200, SUCCESS, {
    accessToken,
    refreshToken,
    user: userForResponse
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.cookies.refreshToken);

  const DOMAIN = getDomainFromUrl(process.env.SERVER_URL);

  // Cookies clear
  res.clearCookie('accessToken', {
    path: '/api/v1',
    domain: DOMAIN,
    sameSite: 'strict',
    httpOnly: true,
    secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });

  res.clearCookie('refreshToken', {
    path: '/api/v1',
    domain: DOMAIN,
    sameSite: 'strict',
    httpOnly: true,
    secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });

  httpResponse(req, res, 200, SUCCESS);
});

export const genNewAccessToken = asyncHandler(async (req, res, next) => {
  const { cookies } = req;
  const { refreshToken, accessToken } = cookies;

  if (req.cookies.accessToken) {
    return httpResponse(req, res, 200, SUCCESS, { accessToken });
  }

  const { newAccessToken, domain } = await authService.refreshUserToken(refreshToken, req, next);

  if (newAccessToken) {
    res.cookie('accessToken', newAccessToken, {
      path: '/api/v1',
      domain,
      sameSite: 'strict',
      maxAge: 1000 * process.env.ACCESS_TOKEN_EXPIRY,
      httpOnly: true,
      secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    });
    return httpResponse(req, res, 200, SUCCESS, {
      accessToken: newAccessToken
    });
  }
});

export const forgotPassword = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateForgotPasswordBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await authService.requestPasswordReset(value.emailAddress, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateResetPasswordBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await authService.resetUserPassword(req.params.token, value.newPassword, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const changePassword = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateChangePasswordBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await authService.changeUserPassword(
    req.user._id,
    value.oldPassword,
    value.newPassword,
    req,
    next
  );

  httpResponse(req, res, 200, SUCCESS);
});

export const googleOAuthSignupHandler = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGoogleSignup, req.body);
  if (error) {
    return httpError(next, error, req, 400);
  }
  const { accessToken, refreshToken, domain } = await authService.googleOAuthSignup(
    value,
    req,
    next
  );
  return httpResponse(req, res, 201, GOOGLE_OAUTH_SIGNUP_SUCCESS, {
    accessToken,
    refreshToken,
    domain
  });
});

export const googleOAuthLoginHandler = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGoogleLogin, req.body);
  if (error) {
    return httpError(next, error, req, 400);
  }
  const result = await authService.googleOAuthLogin(value, req, next);
  return httpResponse(req, res, 200, GOOGLE_OAUTH_LOGIN_SUCCESS, result);
});
