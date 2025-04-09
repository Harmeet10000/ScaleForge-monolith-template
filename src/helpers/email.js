import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_KEY)

export const sendEmail = async (to, subject, text) => {
    try {
        await resend.emails.send({
            from: 'HS <onboarding@resend.dev>',
            to,
            subject,
            text
        })
    } catch (err) {
        httpError(next, err, req, 500)
    }
}
