import { RefreshToken } from './refreshToken.js';
import asyncHandler from 'express-async-handler';

export const createRefreshToken = asyncHandler(
  async (tokenData) => await RefreshToken.create(tokenData)
);

export const findRefreshToken = asyncHandler(
  async (token) => await RefreshToken.findOne({ token })
);

export const deleteRefreshToken = asyncHandler(
  async (token) => await RefreshToken.findOneAndDelete({ token })
);
