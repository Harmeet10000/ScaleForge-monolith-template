import { RefreshToken as RefreshTokenModel } from '../db/models/refreshToken';
import { IRefreshToken } from '../types/userTypes';

export const createRefreshToken = async (tokenData: Pick<IRefreshToken, 'token'>) =>
  await RefreshTokenModel.create(tokenData);

export const findRefreshToken = async (token: string) => await RefreshTokenModel.findOne({ token });

export const deleteRefreshToken = async (token: string) =>
  await RefreshTokenModel.findOneAndDelete({ token });
