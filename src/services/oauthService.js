import { User } from '../models/userModel.js';
import { httpError } from '../utils/httpError.js';
import jwt from 'jsonwebtoken';

export class OAuthService {
  static generateToken(user) {
    return jwt.sign({ id: 'user._id', role: 'user.role' }, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    });
  }

  static async findOrCreateUser(profile, provider, req, next) {
    try {
      // Check if user exists
      let user = await User.findOne({
        $or: [{ oauth_id: profile.id, provider }, { emailAddress: profile.emails[0].value }]
      });

      if (user) {
        // Update user's OAuth info if they're logging in with OAuth for the first time
        if (!user.oauth_id && !user.provider) {
          user.oauth_id = profile.id;
          user.provider = provider;
          user.image = profile.photos[0].value;
          await user.save();
        }
        return user;
      }

      // Create new user if doesn't exist
      user = await User.create({
        oauth_id: profile.id,
        provider,
        name: profile.displayName,
        emailAddress: profile.emails[0].value,
        image: profile.photos[0].value,
        timezone: 'UTC',
        phoneNumber: {
          isoCode: '',
          countryCode: '',
          internationalNumber: ''
        },
        consent: true,
        accountConfirmation: {
          status: true,
          token: '',
          code: '',
          timestamp: new Date()
        }
      });

      return user;
    } catch (error) {
      return httpError(next, error, req, 500);
    }
  }
}
