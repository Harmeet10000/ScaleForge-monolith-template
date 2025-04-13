import { Resend } from 'resend';
import { httpError } from '../utils/httpError.js';

const resend = new Resend(process.env.RESEND_KEY);

export const sendEmail = async (to, subject, text) => {
  try {
    await resend.emails.send({
      from: 'HS <onboarding@resend.dev>',
      to,
      subject,
      text
    });
  } catch (err) {
    // eslint-disable-next-line no-undef
    httpError(next, err, req, 500);
  }
};
