import { RefreshToken } from '../models/refreshToken.js';

export const createRefreshToken = async (tokenData) => await RefreshToken.create(tokenData);

export const findRefreshToken = async (token) => await RefreshToken.findOne({ token });

export const deleteRefreshToken = async (token) => await RefreshToken.findOneAndDelete({ token });
