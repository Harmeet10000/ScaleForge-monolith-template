import { JwtPayload } from 'jsonwebtoken';
import { Document, Types, Model } from 'mongoose';
import { EUserRole } from '../constant/application';

export interface IUserBase {
  name: string;
  emailAddress: string;
  phoneNumber: {
    isoCode: string;
    countryCode: string;
    internationalNumber: string;
  };
  timezone: string;
  role: (typeof EUserRole)[keyof typeof EUserRole];
  accountConfirmation: {
    status: boolean;
    token: string;
    code: string;
    timestamp: Date | null;
  };
  googleId?: string; // Added for Google OAuth
  avatar?: string; // Added for Google OAuth
  passwordReset: {
    token: string | null;
    expiry: number | null;
    lastResetAt: Date | null;
  };
  lastLoginAt: Date | null;
  consent: boolean;
}

export interface IUser extends IUserBase {
  password: string;
}

export interface IUserWithId extends IUserBase {
  _id: Types.ObjectId;
  id?: string;
  password?: string;
  __v?: number;
}

export interface IUserDocument
  extends Omit<Document<Types.ObjectId, {}, IUser>, 'toObject'>,
    IUser {
  id?: string;
  toObject(): IUserWithId;
}

export interface IUserModel extends Model<IUserDocument> {
  findByEmailAddress(email: string): Promise<IUserDocument | null>;
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
