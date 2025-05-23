import { User } from '../models/userModel.js';

export const registerUser = async (payload) => await User.create(payload);

export const findUserById = async (id, select = '') => await User.findById(id).select(select);

export const findByIdWithPassword = async (id) => await User.findById(id).select('+password');
export const findUserByEmailAddress = async (emailAddress, select = '+password') =>
  await User.findOne({
    emailAddress
  }).select(select);

export const findUserByConfirmationTokenAndCode = async (token, code) =>
  await User.findOne({
    'accountConfirmation.token': token,
    'accountConfirmation.code': code
  });

export const findByResetToken = async (token) =>
  await User.findOne({
    'passwordReset.token': token
  });

export const updateUserLastLogin = async (userId) =>
  await User.findByIdAndUpdate(
    userId,
    { lastLoginAt: new Date() },
    { new: true, runValidators: true }
  );
