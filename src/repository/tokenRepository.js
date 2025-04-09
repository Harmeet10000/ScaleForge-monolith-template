import { RefreshToken } from '../models/refreshToken.js'

export const createRefreshToken = async (tokenData) => {
    return await RefreshToken.create(tokenData)
}

export const findRefreshToken = async (token) => {
    return await RefreshToken.findOne({ token })
}

export const deleteRefreshToken = async (token) => {
    return await RefreshToken.findOneAndDelete({ token })
}
