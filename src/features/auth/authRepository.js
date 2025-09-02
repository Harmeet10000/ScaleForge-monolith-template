import { User } from './userModel.js';
import asyncHandler from 'express-async-handler';

export const registerUser = asyncHandler(async (payload) => await User.create(payload));

export const findUserById = asyncHandler(
  async (id, select = '') => await User.findById(id).select(select)
);

export const findByIdWithPassword = asyncHandler(
  async (id) => await User.findById(id).select('+password')
);
export const findUserByEmailAddress = asyncHandler(
  async (emailAddress, select = '+password') =>
    await User.findOne({
      emailAddress
    }).select(select)
);

export const findUserByConfirmationTokenAndCode = asyncHandler(
  async (token, code) =>
    await User.findOne({
      'accountConfirmation.token': token,
      'accountConfirmation.code': code
    })
);

export const findByResetToken = asyncHandler(
  async (token) =>
    await User.findOne({
      'passwordReset.token': token
    })
);

export const updateUserLastLogin = asyncHandler(
  async (userId) =>
    await User.findByIdAndUpdate(
      userId,
      { lastLoginAt: new Date() },
      { new: true, runValidators: true }
    )
);
