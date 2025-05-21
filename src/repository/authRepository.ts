import { User } from '../models/userModel';
import { IUser, IUserDocument } from '../types/userTypes';
import dayjs from 'dayjs';

export const registerUser = async (payload: Partial<IUser>): Promise<IUserDocument> =>
  await User.create(payload);

export const findUserById = async (
  id: string,
  select: string = ''
): Promise<IUserDocument | null> => await User.findById(id).select(select);

export const findByIdWithPassword = async (id: string): Promise<IUserDocument | null> =>
  await User.findById(id).select('+password');

export const findUserByEmailAddress = async (
  emailAddress: string,
  select: string = ''
): Promise<IUserDocument | null> =>
  await User.findOne({
    emailAddress
  }).select(select);

export const findUserByConfirmationTokenAndCode = async (
  token: string,
  code: string
): Promise<IUserDocument | null> =>
  await User.findOne({
    'accountConfirmation.token': token,
    'accountConfirmation.code': code
  });

// Added for Google OAuth
export const findUserByGoogleId = async (googleId: string): Promise<IUserDocument | null> =>
  await User.findOne({ googleId });

export const findByResetToken = async (token: string): Promise<IUserDocument | null> =>
  await User.findOne({
    'passwordReset.token': token
  });

export const updateUserLastLogin = async (userId: string) => {
  return await User.findByIdAndUpdate(
    userId,
    { lastLoginAt: dayjs().utc().toDate() },
    { new: true }
  );
};
