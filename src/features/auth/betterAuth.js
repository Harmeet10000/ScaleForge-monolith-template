import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import mongoose from 'mongoose';

export const auth = betterAuth({
  database: mongodbAdapter(mongoose.connection),
  emailAndPassword: {
    enabled: true
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${process.env.SERVER_URL}/api/v1/auth/callback/google`,
      scope: ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/gmail.readonly']
    }
  },
  baseURL: process.env.SERVER_URL,
  basePath: '/api/v1/auth',
  trustedOrigins: process.env.FRONTEND_URL.split(','),
  advanced: {
    useSecureCookies: false
  }
});
