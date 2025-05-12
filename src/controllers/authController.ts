import { Request, Response, NextFunction } from 'express';
import { httpResponse } from '../utils/httpResponse';
import { httpError } from '../utils/httpError';
import { catchAsync } from '../utils/catchAsync';
import {
  validateSchema,
  ValidateRegisterBody,
  ValidateLoginBody,
  ValidateForgotPasswordBody,
  ValidateResetPasswordBody,
  ValidateChangePasswordBody
} from '../validations/authValidation';
import * as authService from '../services/authService';
import { SUCCESS } from '../constant/responseMessage';
import { EApplicationEnvironment } from '../constant/application';
import { getDomainFromUrl } from '../helpers/generalHelper';
import config from '../config/dotenvConfig';
import { ZodError } from 'zod';
import {
  IChangePasswordRequestBody,
  IForgotPasswordRequestBody,
  ILoginUserRequestBody,
  IRegisterUserRequestBody,
  IResetPasswordRequestBody,
  IUserWithId
} from '../types/userTypes';

// Extend Request to include user property
interface AuthRequest extends Request {
  user?: IUserWithId;
}

export const register = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validateSchema<IRegisterUserRequestBody>(ValidateRegisterBody, req.body);
  if (error) {
    return httpError(next, error as ZodError, req, 422);
  }

  const newUser = await authService.registerUser(value);

  httpResponse(req, res, 201, SUCCESS, { _id: newUser._id });
});

export const confirmation = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  await authService.confirmAccount(req.params.token, req.query.code as string, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const login = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validateSchema<ILoginUserRequestBody>(ValidateLoginBody, req.body);
  if (error) {
    return httpError(next, error as ZodError, req, 422);
  }

  const loginResult = await authService.loginUser(value, req, next);

  if (!loginResult) {
    return;
  }

  const { accessToken, refreshToken, domain } = loginResult;
  // Set cookies
  res
    .cookie('accessToken', accessToken, {
      path: '/api/v1',
      // domain,
      sameSite: 'strict',
      maxAge: 1000 * 3600,
      httpOnly: true,
      secure: !(config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    })
    .cookie('refreshToken', refreshToken, {
      path: '/api/v1',
      // domain,
      sameSite: 'strict',
      maxAge: 1000 * 3600,
      httpOnly: true,
      secure: !(config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
    });

  httpResponse(req, res, 200, SUCCESS, {
    accessToken,
    refreshToken
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  await authService.logoutUser(req.cookies.refreshToken);

  const DOMAIN = getDomainFromUrl(config.SERVER_URL);

  // Cookies clear
  res.clearCookie('accessToken', {
    path: '/api/v1',
    // domain: DOMAIN,
    sameSite: 'strict',
    httpOnly: true,
    secure: !(config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });

  res.clearCookie('refreshToken', {
    path: '/api/v1',
    // domain: DOMAIN,
    sameSite: 'strict',
    httpOnly: true,
    secure: !(config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
  });

  httpResponse(req, res, 200, SUCCESS);
});

export const genNewAccessToken = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
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
        maxAge: 1000 * config.ACCESS_TOKEN_EXPIRY,
        httpOnly: true,
        secure: !(config.NODE_ENV === EApplicationEnvironment.DEVELOPMENT)
      });

      return httpResponse(req, res, 200, SUCCESS, { accessToken: newAccessToken });
    }
  }
);

export const forgotPassword = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = validateSchema<IForgotPasswordRequestBody>(
      ValidateForgotPasswordBody,
      req.body
    );
    if (error) {
      return httpError(next, error as ZodError, req, 422);
    }

    await authService.requestPasswordReset(value.emailAddress, req, next);

    httpResponse(req, res, 200, SUCCESS);
  }
);

export const resetPassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = validateSchema<IResetPasswordRequestBody>(
    ValidateResetPasswordBody,
    req.body
  );
  if (error) {
    return httpError(next, error as ZodError, req, 422);
  }

  await authService.resetUserPassword(req.params.token, value.newPassword, req, next);

  httpResponse(req, res, 200, SUCCESS);
});

export const changePassword = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { error, value } = validateSchema<IChangePasswordRequestBody>(
      ValidateChangePasswordBody,
      req.body
    );
    if (error) {
      return httpError(next, error as ZodError, req, 422);
    }

    await authService.changeUserPassword(
      req.user!._id.toString(),
      value.oldPassword,
      value.newPassword,
      req,
      next
    );

    httpResponse(req, res, 200, SUCCESS);
  }
);
