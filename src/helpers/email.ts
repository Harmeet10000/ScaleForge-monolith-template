import { Resend } from 'resend';
import { Request, Response, NextFunction } from 'express';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { httpResponse } from '../utils/httpResponse.js'; // Import httpResponse
import { logger } from '../utils/logger.js';
import config from '../config/dotenvConfig.js';
import { EmailRequestBody } from '../types/interfaces.js';

// New function for sending emails without requiring Express Request
export const sendEmail = async (
  to: string | string[],
  subject: string,
  text: string
): Promise<string> => {
  logger.info('Sending email', { meta: { to, subject } });

  const resendApiKey = config.RESEND_KEY;

  if (!resendApiKey) {
    const error = new Error('Email service configuration error.');
    logger.error(error.message);
    throw error;
  }

  const resend = new Resend(resendApiKey);

  try {
    const emailResponse = await resend.emails.send({
      from: 'contact@shikshadost.com',
      to: Array.isArray(to) ? to : [to],
      subject,
      html: text
    });

    logger.info('Email sent successfully', { meta: { to, emailId: emailResponse.data?.id } });
    return emailResponse.data?.id || ''; // Return the ID or an empty string if not found
  } catch (error) {
    logger.error('Failed to send email', { meta: { error, to } });
    throw error;
  }
};

// Original Resendmail function for route handlers
export const Resendmail = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const {
    name = '',
    to = '',
    verificationURL = '',
    role = '',
    password = '',
    use = '',
    schedule = {},
    meetingLink = '',
    razorpay_order_id = '',
    razorpay_payment_id = '',
    razorpay_signature = ''
  } = (req.body as EmailRequestBody) || {};

  logger.info('Sending email', { meta: { to, role, use } });

  const resendApiKey = config.RESEND_KEY;

  if (!resendApiKey) {
    logger.error('Resend API key is missing.');
    return httpError(next, new Error('Email service configuration error.'), req, 500);
  }

  const resend = new Resend(resendApiKey);

  let htmlContent = '';
  let subject = '';

  if (role === 'mentor' && use === 'signup') {
    // Mentor signup email
    htmlContent = getMentorSignupTemplate(name, to, password);
    subject = 'Welcome to the ShikshaDost Platform!';
  } else if (role === 'mentor' && use === 'meeting') {
    // Mentor meeting details email template
    htmlContent = getMentorMeetingTemplate(name, schedule, meetingLink);
    subject = 'Meeting Details from ShikshaDost';
  } else if (role === 'student' && use === 'meeting') {
    // Student meeting details email template
    htmlContent = getStudentMeetingTemplate(
      name,
      schedule,
      meetingLink,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    subject = 'Meeting Details from ShikshaDost';
  } else if (role === 'student' && use === 'signup') {
    // Student signup email
    htmlContent = getStudentSignupTemplate(name, verificationURL);
    subject = 'Verify Your Email Address';
  } else if (use === 'otp') {
    // OTP email template
    htmlContent = getOTPTemplate(name, (req.body as EmailRequestBody).otp || '');
    subject = 'Your Verification Code';
  } else if (use === 'confirmation') {
    // General confirmation email
    htmlContent = getConfirmationTemplate(
      name,
      (req.body as EmailRequestBody).message || 'Your request has been confirmed'
    );
    subject = 'Confirmation from ShikshaDost';
  } else {
    logger.warn('Unknown email template requested', { meta: { role, use } });
    // Use httpError to pass a structured error with a specific status code
    return httpError(next, new Error('Invalid email template requested'), req, 400);
  }

  const emailResponse = await resend.emails.send({
    from: 'contact@shikshadost.com',
    to,
    subject,
    html: htmlContent
  });

  logger.info('Email sent successfully', { meta: { to, emailId: emailResponse.data?.id } });

  // Use httpResponse for successful response
  httpResponse(req, res, 200, 'Email sent successfully', { emailId: emailResponse.data?.id });
});

/**
 * Template for mentor signup emails
 */
const getMentorSignupTemplate = (name: string, email: string, password: string): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ShikshaDost</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
        }
        .credentials {
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2c5282;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5282;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #1a365d;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .link {
            word-break: break-all;
            color: #2c5282;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to ShikshaDost!</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <p>Welcome to ShikshaDost! We are thrilled to have you join us as a mentor. Your expertise and guidance will make a meaningful impact on our community.</p>
            
            <div class="credentials">
                <p><strong>Your Login Details:</strong></p>
                <p>Email: ${email}<br>Password: ${password}</p>
            </div>
            
            <center>
                <a href="http://localhost:5173/register" class="button">Login to Your Account</a>
            </center>
            
            <p><small>Or copy and paste this link in your browser:<br>
            <span class="link">http://localhost:5173/register</span></small></p>
            
            <p>If you have any questions or need assistance, feel free to reach out to our support team.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Template for student signup emails
 */
const getStudentSignupTemplate = (name: string, verificationURL: string): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5282;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #1a365d;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .notice {
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2c5282;
            font-style: italic;
        }
        .link {
            word-break: break-all;
            color: #2c5282;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <p>Thank you for creating an account with ShikshaDost. To complete your registration and access all features, please verify your email address by clicking the button below:</p>
            
            <center>
                <a href="${verificationURL}" class="button">Verify Email Address</a>
            </center>
            
            <p><small>Or copy and paste this link in your browser:<br>
            <span class="link">${verificationURL}</span></small></p>
            
            <div class="notice">
                <p>This link will expire in 24 hours for security reasons.</p>
            </div>
            
            <p>If you didn't create an account with ShikshaDost, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Template for mentor meeting emails
 */
const getMentorMeetingTemplate = (
  name: string,
  schedule: { on?: string | Date; start?: string; end?: string },
  meetingLink: string
): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Details</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
        }
        .meeting-details {
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2c5282;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5282;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #1a365d;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .link {
            word-break: break-all;
            color: #2c5282;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Meeting Details</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <p>Your upcoming meeting with your student has been scheduled. Please find the details below:</p>
            
            <div class="meeting-details">
                <p><strong>Date:</strong> ${new Date(schedule.on || '').toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${schedule.start} to ${schedule.end}</p>
                <p><strong>Meeting Link:</strong> <a href="${meetingLink}" class="link">${meetingLink}</a></p>
            </div>
            
            <center>
                <a href="${meetingLink}" class="button">Join Meeting</a>
            </center>
            
            <p>Please ensure you join the meeting 5 minutes before the scheduled time. If you face any technical difficulties, please contact our support team.</p>
            
            <p>We look forward to your valuable session!</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Template for student meeting emails
 */
const getStudentMeetingTemplate = (
  name: string,
  schedule: { on?: string | Date; start?: string; end?: string },
  meetingLink: string,
  orderId: string,
  paymentId: string,
  signature: string
): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Meeting Details</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            color: #2c5282;
            border-bottom: 1px solid #eaeaea;
            padding-bottom: 5px;
            margin-bottom: 15px;
        }
        .meeting-details, .payment-details {
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #2c5282;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #2c5282;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            font-weight: 600;
            margin: 20px 0;
            transition: background-color 0.3s ease;
        }
        .button:hover {
            background-color: #1a365d;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .link {
            word-break: break-all;
            color: #2c5282;
        }
        .payment-id {
            font-family: monospace;
            background-color: #eee;
            padding: 2px 5px;
            border-radius: 3px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Meeting Confirmation</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <p>Thank you for booking a session with our mentor. Your meeting has been confirmed!</p>
            
            <div class="section">
                <h2 class="section-title">Meeting Details</h2>
                <div class="meeting-details">
                    <p><strong>Date:</strong> ${new Date(schedule.on || '').toLocaleDateString()}</p>
                    <p><strong>Time:</strong> ${schedule.start} to ${schedule.end}</p>
                    <p><strong>Meeting Link:</strong> <a href="${meetingLink}" class="link">${meetingLink}</a></p>
                </div>
                
                <center>
                    <a href="${meetingLink}" class="button">Join Meeting</a>
                </center>
            </div>
            
        }
        .container {
            max-width: 600px;
                    <p><strong>Order ID:</strong> <span class="payment-id">${orderId}</span></p>
                    <p><strong>Payment ID:</strong> <span class="payment-id">${paymentId}</span></p>
                    <p><strong>Transaction Status:</strong> Completed</p>
                </div>
                <p>Please keep this information for your records. A detailed receipt has been saved to your account.</p>
            </div>
            
            <p>We look forward to your valuable learning session! If you need to reschedule, please contact us at least 24 hours before your scheduled time.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Template for OTP verification emails
 */
const getOTPTemplate = (name: string, otp: string): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Verification Code</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
            text-align: center;
        }
        .otp-container {
            margin: 30px 0;
        }
        .otp-code {
            font-family: monospace;
            font-size: 36px;
            letter-spacing: 5px;
            background-color: #f0f4f8;
            padding: 15px 20px;
            border-radius: 5px;
            border: 1px dashed #2c5282;
            font-weight: bold;
            color: #2c5282;
        }
        .notice {
            background-color: #f0f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2c5282;
            text-align: left;
            font-style: italic;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Verification Code</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <p>Use the following code to complete your verification:</p>
            
            <div class="otp-container">
                <span class="otp-code">${otp}</span>
            </div>
            
            <div class="notice">
                <p>This code will expire in 10 minutes for security reasons. Please do not share this code with anyone.</p>
            </div>
            
            <p>If you didn't request this code, please ignore this email.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;

/**
 * Template for general confirmation emails
 */
const getConfirmationTemplate = (name: string, message: string): string => `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f9f9f9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 15px;
            border-bottom: 1px solid #eaeaea;
        }
        .header h1 {
            color: #2c5282;
            margin: 0;
            font-size: 28px;
        }
        .content {
            padding: 20px 0;
        }
        .message-box {
            background-color: #f0f4f8;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #2c5282;
            font-size: 18px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eaeaea;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Confirmation</h1>
        </div>
        <div class="content">
            <p>Hello ${name},</p>
            
            <div class="message-box">
                ${message}
            </div>
            
            <p>Thank you for choosing ShikshaDost. If you have any questions or need assistance, please feel free to contact our support team.</p>
        </div>
        <div class="footer">
            <p>Best regards,<br>Team ShikshaDost</p>
            <p>&copy; ${new Date().getFullYear()} ShikshaDost. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`;
