const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env with override: true
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const requiredEnvVars = [
  'PORT',
  'NODE_ENV',
  'MONGO_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'OTP_HMAC_SECRET',
  'CLIENT_URL',
];

function validateEnv() {
  if (!process.env.CLIENT_URL && process.env.FRONTEND_URL) {
    process.env.CLIENT_URL = process.env.FRONTEND_URL;
  }

  const missing = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(`[FATAL] Missing required environment variables: ${missing.join(', ')}`);
  }

  // Security constraint: DEV_OTP_LOG must NEVER be enabled in production
  if (process.env.NODE_ENV === 'production' && process.env.DEV_OTP_LOG === 'true') {
    throw new Error('[FATAL] DEV_OTP_LOG must not be enabled in production environment!');
  }

  // In production, fail fast if email provider or EMAIL_FROM is missing
  if (process.env.NODE_ENV === 'production') {
    const hasEmailProvider = Boolean(
      process.env.RESEND_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASSWORD)
    );
    if (!hasEmailProvider) {
      throw new Error(
        '[FATAL] Missing email provider configuration. Either RESEND_API_KEY or SMTP credentials must be set in production.'
      );
    }
    if (!process.env.EMAIL_FROM) {
      throw new Error('[FATAL] EMAIL_FROM must be configured in production environment!');
    }
  }

  return {
    HOST: process.env.HOST || '0.0.0.0',
    PORT: parseInt(process.env.PORT || '5001', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    OTP_HMAC_SECRET: process.env.OTP_HMAC_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY || '',
    SMTP_HOST: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER || '',
    SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
    EMAIL_FROM:
      process.env.EMAIL_FROM ||
      (process.env.RESEND_API_KEY
        ? 'KIET Lost & Found <onboarding@resend.dev>'
        : 'KIET Lost & Found <no-reply@kiet.edu>'),
    ALLOWED_EMAIL_DOMAIN: (process.env.ALLOWED_EMAIL_DOMAIN || 'kiet.edu').trim().toLowerCase(),
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    CLIENT_URL: process.env.CLIENT_URL || process.env.FRONTEND_URL || 'http://localhost:5174',
    DEV_OTP_LOG: process.env.DEV_OTP_LOG === 'true',
  };
}

module.exports = {
  validateEnv,
  env: validateEnv(),
};
