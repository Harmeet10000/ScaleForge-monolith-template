import { Resend } from 'resend';
import { logger } from '../utils/logger.js';

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

// Account confirmation email template
const getAccountConfirmationTemplate = (info) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirm Your Account</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9f9f9; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; padding-bottom: 15px; border-bottom: 1px solid #eaeaea; }
        .header h1 { color: #2c5282; margin: 0; font-size: 28px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2c5282; color: white !important; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s ease; }
        .button:hover { background-color: #1a365d; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px; }
        .notice { background-color: #f0f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2c5282; font-style: italic; }
        .link { word-break: break-all; color: #2c5282; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Confirm Your Account</h1>
        </div>
        <div class="content">
            <p>Hello ${info.name || ''},</p>
            <p>Thank you for registering with us. Please confirm your account by clicking the button below:</p>
            <center>
                <a href="${info.confirmationUrl}" class="button">Confirm Account</a>
            </center>
            <p><small>Or copy and paste this link in your browser:<br>
            <span class="link">${info.confirmationUrl}</span></small></p>
            <div class="notice">
                <p>This link will expire in 24 hours for security reasons.</p>
            </div>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team haven</p>
            <p>&copy; ${new Date().getFullYear()} haven. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

// Confirmation success email template
const getConfirmationSuccessTemplate = (info) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Confirmed</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9f9f9; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #eaeaea; padding-bottom: 15px; }
        .header h1 { color: #2c5282; margin: 0; font-size: 28px; }
        .content { padding: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Account Confirmed</h1>
        </div>
        <div class="content">
            <p>Hello ${info.name || ''},</p>
            <p>Your account has been confirmed. You can now log in and use all features of haven.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team haven</p>
            <p>&copy; ${new Date().getFullYear()} haven. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

// Password reset request email template
const getRequestPasswordResetTemplate = (info) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Request</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9f9f9; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #eaeaea; padding-bottom: 15px; }
        .header h1 { color: #2c5282; margin: 0; font-size: 28px; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background-color: #2c5282; color: white !important; text-decoration: none; border-radius: 5px; font-weight: 600; margin: 20px 0; transition: background-color 0.3s ease; }
        .button:hover { background-color: #1a365d; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px; }
        .notice { background-color: #f0f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2c5282; font-style: italic; }
        .link { word-break: break-all; color: #2c5282; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hello ${info.name || ''},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <center>
                <a href="${info.confirmationUrl || info.resetUrl}" class="button">Reset Password</a>
            </center>
            <p><small>Or copy and paste this link in your browser:<br>
            <span class="link">${info.confirmationUrl || info.resetUrl}</span></small></p>
            <div class="notice">
                <p>This link will expire in 1 hour for security reasons.</p>
            </div>
            <p>If you did not request a password reset, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team haven</p>
            <p>&copy; ${new Date().getFullYear()} haven. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

// Password reset success email template
const getResetUserPasswordTemplate = (info) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset Successful</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9f9f9; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #eaeaea; padding-bottom: 15px; }
        .header h1 { color: #2c5282; margin: 0; font-size: 28px; }
        .content { padding: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Successful</h1>
        </div>
        <div class="content">
            <p>Hello ${info.name || ''},</p>
            <p>Your password has been reset successfully. If you did not perform this action, please contact our support team immediately.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team haven</p>
            <p>&copy; ${new Date().getFullYear()} haven. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

// Password changed email template
const getChangeUserPasswordTemplate = (info) => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f9f9f9; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 3px 10px rgba(0,0,0,0.1); padding: 20px; }
        .header { text-align: center; border-bottom: 1px solid #eaeaea; padding-bottom: 15px; }
        .header h1 { color: #2c5282; margin: 0; font-size: 28px; }
        .content { padding: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Changed</h1>
        </div>
        <div class="content">
            <p>Hello ${info.name || ''},</p>
            <p>Your password has been changed successfully. If you did not perform this action, please contact our support team immediately.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team haven</p>
            <p>&copy; ${new Date().getFullYear()} haven. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
