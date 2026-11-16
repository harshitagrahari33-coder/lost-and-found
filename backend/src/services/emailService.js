const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const ApiError = require('../utils/ApiError');

let resendClient = null;
let smtpTransporter = null;

function getResendClient() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;
  if (!resendClient || resendClient._apiKey !== apiKey) {
    resendClient = new Resend(apiKey);
    resendClient._apiKey = apiKey;
  }
  return resendClient;
}

function getSmtpTransporter() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  if (!user || !pass) return null;

  if (!smtpTransporter) {
    const host = process.env.SMTP_HOST || 'smtp.mailtrap.io';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    smtpTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return smtpTransporter;
}

function getEmailTemplate(otp) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; background-color: #FBF9F4; border-radius: 16px; border: 1px solid #E2DED4; color: #17201B;">
      <div style="text-align: center; margin-bottom: 28px;">
        <h2 style="color: #234C3B; margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">KIET Lost &amp; Found</h2>
        <p style="color: #69736D; font-size: 13px; margin: 0;">Institutional Campus Item Recovery Platform</p>
      </div>
      
      <div style="background-color: #FFFFFF; padding: 28px 20px; border-radius: 12px; border: 1px solid #E2DED4; text-align: center; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
        <p style="font-size: 14px; color: #17201B; margin: 0 0 16px 0; font-weight: 500;">
          Use the following verification code to access your campus account:
        </p>
        <div style="display: inline-block; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #234C3B; background-color: #F0F7F3; padding: 14px 28px; border-radius: 10px; border: 1px solid #C7E3D3; user-select: all;">
          ${otp}
        </div>
        <p style="font-size: 12px; color: #69736D; margin: 18px 0 0 0;">
          Valid for <strong>5 minutes</strong>. Never share this single-use code with anyone.
        </p>
      </div>

      <p style="font-size: 12px; color: #97A19B; text-align: center; margin: 0; line-height: 1.5;">
        This email was sent to your official KIET institutional address.<br/>
        If you did not request this verification code, please disregard this email.
      </p>
    </div>
  `;
}

async function sendOtpEmail(email, otp) {
  const normalizedEmail = email.trim().toLowerCase();
  const resend = getResendClient();
  const smtp = getSmtpTransporter();

  if (!resend && !smtp) {
    throw ApiError.serviceUnavailable(
      'Email provider is not configured. Please add RESEND_API_KEY (or SMTP credentials) in backend/.env to send verification codes to @kiet.edu addresses.',
      'EMAIL_PROVIDER_NOT_CONFIGURED'
    );
  }

  const subject = `Your KIET Lost & Found Verification Code: ${otp}`;
  const textContent = `Your KIET Lost & Found verification code is: ${otp}. Valid for 5 minutes. Never share this code with anyone.`;
  const htmlContent = getEmailTemplate(otp);

  // 1. Deliver via Resend
  if (resend) {
    const from = process.env.EMAIL_FROM || 'KIET Lost & Found <onboarding@resend.dev>';
    try {
      const response = await resend.emails.send({
        from,
        to: [normalizedEmail],
        subject,
        text: textContent,
        html: htmlContent,
      });

      if (response.error) {
        console.error('[EMAIL] Resend delivery error:', response.error.message || response.error);
        const errMsg = response.error.message || 'Resend delivery rejected';
        throw ApiError.badGateway(
          `Email delivery failed: ${errMsg}`,
          'EMAIL_DELIVERY_FAILED'
        );
      }

      console.log(`[EMAIL] Verification email sent to ${normalizedEmail} via Resend (ID: ${response.data?.id})`);
      return { provider: 'resend', id: response.data?.id };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.error('[EMAIL] Resend unexpected error:', err.message);
      throw ApiError.badGateway(
        `Email delivery failed via Resend: ${err.message}`,
        'EMAIL_DELIVERY_FAILED'
      );
    }
  }

  // 2. Fallback to SMTP
  const from = process.env.EMAIL_FROM || 'KIET Lost & Found <no-reply@kiet.edu>';
  try {
    const info = await smtp.sendMail({
      from,
      to: normalizedEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });
    console.log(`[EMAIL] Verification email sent to ${normalizedEmail} via SMTP (MessageID: ${info.messageId})`);
    return { provider: 'smtp', messageId: info.messageId };
  } catch (err) {
    console.error('[EMAIL] SMTP delivery failure:', err.message);
    throw ApiError.badGateway(
      `Email delivery failed via SMTP: ${err.message}`,
      'EMAIL_DELIVERY_FAILED'
    );
  }
}

module.exports = {
  sendOtpEmail,
  getResendClient,
  getSmtpTransporter,
};
