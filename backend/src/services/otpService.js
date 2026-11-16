const OTP = require('../models/OTP');
const { generateOtpDigits, hashOtp, verifyOtpHash } = require('../utils/hashOtp');
const { sendOtpEmail } = require('./emailService');
const { normalizeEmail } = require('../utils/validators');
const ApiError = require('../utils/ApiError');

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30-second cooldown
const MAX_ATTEMPTS = 5;

async function requestOtp(email) {
  const normalizedEmail = normalizeEmail(email);
  const secret = process.env.OTP_HMAC_SECRET;

  if (!secret) {
    throw ApiError.internal('OTP_HMAC_SECRET is not configured on the server', 'CONFIG_ERROR');
  }

  // Enforce resend cooldown based on most recent OTP timestamp
  const existingOtp = await OTP.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
  if (existingOtp) {
    const elapsedMs = Date.now() - new Date(existingOtp.createdAt).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000);
      throw ApiError.tooManyRequests(
        `Please wait ${waitSeconds}s before requesting a new verification code.`,
        'OTP_COOLDOWN'
      );
    }
  }

  // Generate 6-digit cryptographic OTP
  const rawOtp = generateOtpDigits();
  const hashed = hashOtp(rawOtp, secret);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // Clean up any expired OTPs for this email first
  await OTP.deleteMany({
    email: normalizedEmail,
    expiresAt: { $lte: new Date() },
  });

  // Store new OTP record with hashed value
  await OTP.create({
    email: normalizedEmail,
    otpHash: hashed,
    expiresAt,
    attempts: 0,
  });

  // Never log OTPs in production
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_OTP_LOG === 'true') {
    console.log(`[DEV_OTP_LOG] Generated OTP for ${normalizedEmail}: ${rawOtp}`);
  }

  // Real email delivery (skipped only during automated unit tests without ENABLE_TEST_EMAIL)
  if (process.env.NODE_ENV !== 'test' || process.env.ENABLE_TEST_EMAIL === 'true') {
    try {
      await sendOtpEmail(normalizedEmail, rawOtp);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production' && (process.env.DEV_OTP_LOG === 'true' || !process.env.NODE_ENV)) {
        console.warn(`⚠️  [DEV] Email delivery failed (${err.message}). Continuing with development OTP: ${rawOtp}`);
      } else {
        // If delivery failed in production, rollback OTP creation so user is not penalized by cooldown
        await OTP.deleteMany({ email: normalizedEmail });
        throw err;
      }
    }
  }

  const response = {
    message: 'A 6-digit verification code has been dispatched to your email address.',
  };

  if (process.env.NODE_ENV !== 'production' && process.env.DEV_OTP_LOG === 'true') {
    response.devOtp = rawOtp;
  }

  return response;
}

async function verifyOtp(email, inputOtp, options = { consume: true }) {
  const normalizedEmail = normalizeEmail(email);
  const secret = process.env.OTP_HMAC_SECRET;

  // Find all active unexpired OTP records for this email (newest first)
  const activeRecords = await OTP.find({
    email: normalizedEmail,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  if (!activeRecords || activeRecords.length === 0) {
    throw ApiError.badRequest('OTP expired. Request a new one.', 'OTP_EXPIRED');
  }

  // Find if any active record matches the inputOtp
  let matchedRecord = null;
  for (const record of activeRecords) {
    if (record.attempts < MAX_ATTEMPTS && verifyOtpHash(inputOtp, record.otpHash, secret)) {
      matchedRecord = record;
      break;
    }
  }

  if (!matchedRecord) {
    // Increment attempts on the latest record
    const latestRecord = activeRecords[0];
    const updatedAttempts = latestRecord.attempts + 1;
    const remaining = MAX_ATTEMPTS - updatedAttempts;

    if (updatedAttempts >= MAX_ATTEMPTS) {
      await OTP.deleteMany({ email: normalizedEmail });
      throw ApiError.badRequest(
        'Too many incorrect attempts. This OTP has been invalidated. Please request a new one.',
        'OTP_LOCKED'
      );
    } else {
      latestRecord.attempts = updatedAttempts;
      await latestRecord.save();
      throw ApiError.badRequest(
        `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        'INVALID_OTP'
      );
    }
  }

  // Success: consume all OTPs for this email if consume is requested
  if (options.consume !== false) {
    await OTP.deleteMany({ email: normalizedEmail });
  }

  return { email: normalizedEmail };
}

module.exports = {
  requestOtp,
  verifyOtp,
};
