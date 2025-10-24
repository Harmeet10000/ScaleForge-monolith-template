import { google } from 'googleapis';
import mongoose from 'mongoose';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import { classifyEmails as classifyEmailsService } from './emailsService.js';

export const getEmails = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 15;
    const { googleAccount } = req;
    // logger.debug('getEmail', { meta: { googleAccount, session, user } });

    if (!googleAccount?.accessToken) {
      return httpError(next, new Error('Google account not connected'), req, 401);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: googleAccount.accessToken,
      refresh_token: googleAccount.refreshToken,
      expiry_date: googleAccount.expiresAt
    });

    oauth2Client.on('tokens', async (tokens) => {
      if (tokens.access_token) {
        const { db } = mongoose.connection;
        await db.collection('account').updateOne(
          { _id: googleAccount._id },
          {
            $set: {
              accessToken: tokens.access_token,
              expiresAt: tokens.expiry_date
            }
          }
        );
      }
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.messages.list({
      userId: 'me',
      maxResults: limit
    });

    const messages = response.data.messages || [];
    const emails = [];

    for (const message of messages) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full'
      });

      const { headers } = email.data.payload;
      const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      emails.push({
        id: email.data.id,
        subject,
        from,
        date,
        snippet: email.data.snippet
      });
    }

    httpResponse(req, res, 200, 'Emails fetched successfully', { emails });
  } catch (error) {
    httpError(next, error, req, 500);
  }
};

export const classifyEmails = async (req, res, next) => {
  try {
    const { emailIds, geminiApiKey } = req.body;
    const { googleAccount } = req;

    if (!geminiApiKey) {
      return httpError(next, new Error('Gemini API key is required'), req, 400);
    }

    if (!googleAccount?.accessToken) {
      return httpError(next, new Error('Google account not connected'), req, 401);
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: googleAccount.accessToken,
      refresh_token: googleAccount.refreshToken,
      expiry_date: googleAccount.expiresAt
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const emails = [];

    for (const id of emailIds) {
      const email = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'full'
      });

      const { headers } = email.data.payload;
      const subject = headers.find((h) => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find((h) => h.name === 'From')?.value || 'Unknown';
      const date = headers.find((h) => h.name === 'Date')?.value || '';

      emails.push({
        id: email.data.id,
        subject,
        from,
        date,
        snippet: email.data.snippet
      });
    }

    const classifications = await classifyEmailsService(emails, geminiApiKey);
    const classifiedEmails = emails.map((email) => {
      const classification = classifications.find((c) => c.id === email.id);
      return { ...email, category: classification?.category || 'general' };
    });

    httpResponse(req, res, 200, 'Emails classified successfully', { emails: classifiedEmails });
  } catch (error) {
    httpError(next, error, req, 500);
  }
};
