import mongoose, { Schema } from 'mongoose';
import { IRefreshToken } from '../types/userTypes';
import config from '../config/dotenvConfig.js';

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: {
      type: String,
      required: true
    }
  },
  { timestamps: true }
);

refreshTokenSchema.index(
  {
    createdAt: 1 // Use 1 for ascending order if that's the intent for TTL index based on creation time
  },
  { expireAfterSeconds: Number(config?.REFRESH_TOKEN_EXPIRY ?? '604800') } // Default to 7 days (604800s) if undefined
);

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
