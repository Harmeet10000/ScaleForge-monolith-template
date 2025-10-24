import mongoose from 'mongoose';
import { logger } from '../../utils/logger.js';
import { auth } from './betterAuth.js';

export const betterAuthProtect = async (req, res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: { cookie: req.headers.cookie }
    });
    // logger.debug('Session found', {
    //   meta: {
    //     cookie: req.headers.cookie,
    //     headers: req.headers,
    //     user: req.user,
    //     session
    //   }
    // });
    if (!session) {
      logger.debug('No session found', {
        meta: {
          cookie: req.headers.cookie,
          headers: req.headers,
          user: req.user,
          session
        }
      });
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { db } = mongoose.connection;
    const accountsCollection = db.collection('account');
    const googleAccount = await accountsCollection.findOne({
      userId: new mongoose.Types.ObjectId(session.user.id),
      providerId: 'google'
    });
    // logger.debug('Google account found', {
    //   meta: {
    //     googleAccount
    //   }
    // });
    req.user = session.user;
    req.session = session;
    req.googleAccount = googleAccount;
    next();
  } catch (error) {
    logger.error('Error in betterAuthProtect', { meta: { error } });
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};
