import { JwtPayload } from 'jsonwebtoken';
import { EUserRole } from '../constant/application.js';

export interface IUser {
  name: string;
  emailAddress: string;
  phoneNumber: {
    isoCode: string;
    countryCode: string;
    internationalNumber: string;
  };
  timezone: string;
  password: string;
  role: EUserRole;
  accountConfirmation: {
    status: boolean;
    token: string;
    code: string;
    timestamp: Date | null;
  };
  passwordReset: {
    token: string | null;
    expiry: number | null;
    lastResetAt: Date | null;
  };
  lastLoginAt: Date | null;
  consent: boolean;
}

export interface IUserWithId extends IUser {
  _id: string;
}

export interface IRefreshToken {
  token: string;
}

export interface IRegisterUserRequestBody {
  name: string;
  emailAddress: string;
  phoneNumber: string;
  password: string;
  consent: boolean;
}

export interface ILoginUserRequestBody {
  emailAddress: string;
  password: string;
}

export interface IDecryptedJwt extends JwtPayload {
  userId: string;
}

export interface IForgotPasswordRequestBody {
  emailAddress: string;
}

export interface IResetPasswordRequestBody {
  newPassword: string;
}

export interface IChangePasswordRequestBody {
  oldPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}
