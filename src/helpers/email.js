import { Resend } from 'resend';
import { logger } from '../utils/logger.js';
import {
  getAccountConfirmationTemplate,
  getChangeUserPasswordTemplate,
  getConfirmationSuccessTemplate,
  getRequestPasswordResetTemplate,
  getResetUserPasswordTemplate
} from './templates/emailTemplates.js';

export const Resendmail = async (info) => {
  try {
    logger.info('Sending email', {
      meta: { to: info.to, subject: info.subject, purpose: info.purpose }
    });

    const resendApiKey = process.env.RESEND_KEY;
    if (!resendApiKey) {
      logger.error('Resend API key is not configured');
      throw new Error('Resend API key is not configured');
    }

    const resend = new Resend(resendApiKey);

    let htmlContent = '';
    switch (info.purpose) {
      case 'accountConfirmation':
        htmlContent = getAccountConfirmationTemplate(info);
        break;
      case 'confirmationSuccess':
        htmlContent = getConfirmationSuccessTemplate(info);
        break;
      case 'requestPasswordReset':
        htmlContent = getRequestPasswordResetTemplate(info);
        break;
      case 'resetUserPassword':
        htmlContent = getResetUserPasswordTemplate(info);
        break;
      case 'changeUserPassword':
        htmlContent = getChangeUserPasswordTemplate(info);
        break;
      default:
        htmlContent = `<p>${info.text}</p>`;
    }

    const emailResponse = await resend.emails.send({
      from: 'contact@shikshadost.com',
      to: info.to,
      subject: info.subject,
      html: htmlContent
    });

    logger.info('Email sent successfully', { meta: { to: info.to, emailId: emailResponse } });
    return {
      success: true,
      message: 'Email sent successfully',
      data: { emailId: emailResponse.id }
    };
  } catch (error) {
    logger.error('Failed to send email', { meta: { error: error.message, stack: error.stack } });
    throw error;
  }
};
