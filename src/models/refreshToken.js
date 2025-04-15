import mongoose, { Schema } from 'mongoose';

const refreshTokenSchema = new Schema(
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
    createdAt: -1
  },
  { expireAfterSeconds: process.env.REFRESH_TOKEN_EXPIRY }
);

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
