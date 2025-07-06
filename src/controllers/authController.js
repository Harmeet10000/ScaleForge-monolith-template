import { httpResponse } from '../utils/httpResponse.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  validateJoiSchema,
  validateRegisterBody,
  validateLoginBody,
  validateForgotPasswordBody,
  validateResetPasswordBody,
  validateChangePasswordBody
} from '../validations/authValidation.js';
import * as authService from '../services/authService.js';
import { SUCCESS } from '../constant/responseMessage.js';
import { EApplicationEnvironment } from '../constant/application.js';
import { getDomainFromUrl } from '../helpers/generalHelper.js';

const isMobileRequest = (req) => {
  const userAgent = req.headers['user-agent'] || '';
  const clientType = req.headers['x-client-type'] || '';
  return (
    clientType.toLowerCase() === 'mobile' ||
    userAgent.toLowerCase().includes('reactnative') ||
    userAgent.toLowerCase().includes('okhttp')
  );
};

const sendToken = ({
  req,
  res,
  tokenName,
  tokenValue,
  path = '/api/v1',
  domain,
  sameSite = 'strict',
  maxAge,
  httpOnly = true,
  secure = true
}) => {
  if (isMobileRequest(req)) {
    return { [tokenName]: tokenValue };
  } else {
    res.cookie(tokenName, tokenValue, {
      path,
      domain,
      sameSite,
      maxAge,
      httpOnly,
      secure
    });
    return {};
  }
};

export const register = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateRegisterBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }
  const newUser = await authService.registerUser(value);
  httpResponse(req, res, 201, SUCCESS, { _id: newUser._id });
});

export const confirmation = catchAsync(async (req, res, next) => {
  await authService.confirmAccount(req.params.token, req.query.code, req, next);
  httpResponse(req, res, 200, SUCCESS);
});

export const login = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateLoginBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { accessToken, refreshToken, domain } = await authService.loginUser(value, req, next);
  const accessTokenPayload = sendToken({
    req,
    res,
    tokenName: 'accessToken',
    tokenValue: accessToken,
    path: '/api/v1',
    domain,
    sameSite: 'strict',
    maxAge: 1000 * 3600,
    httpOnly: true,
    secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });
  const refreshTokenPayload = sendToken({
    req,
    res,
    tokenName: 'refreshToken',
    tokenValue: refreshToken,
    path: '/api/v1',
    domain,
    sameSite: 'strict',
    maxAge: 1000 * 3600,
    httpOnly: true,
    secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });

  httpResponse(req, res, 200, SUCCESS, {
    ...accessTokenPayload,
    ...refreshTokenPayload
  });
});

export const logout = catchAsync(async (req, res) => {
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

export const genNewAccessToken = catchAsync(async (req, res, next) => {
  const { cookies } = req;
  const { refreshToken, accessToken } = cookies;

  if (req.cookies.accessToken) {
    return httpResponse(req, res, 200, SUCCESS, { accessToken });
  }

  const { newAccessToken, domain } = await authService.refreshUserToken(refreshToken, req, next);

  if (newAccessToken) {
    const accessTokenPayload = sendToken({
      req,
      res,
      tokenName: 'accessToken',
      tokenValue: newAccessToken,
      path: '/api/v1',
      domain,
      sameSite: 'strict',
      maxAge: 1000 * process.env.ACCESS_TOKEN_EXPIRY,
      httpOnly: true,
      secure: !(process.env.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    });
    return httpResponse(req, res, 200, SUCCESS, {
      ...accessTokenPayload,
      accessToken: newAccessToken
    });
  }
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateForgotPasswordBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await authService.requestPasswordReset(value.emailAddress, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateResetPasswordBody, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await authService.resetUserPassword(req.params.token, value.newPassword, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const changePassword = catchAsync(async (req, res, next) => {
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
