const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

const isTest = process.env.NODE_ENV === 'test';
const isDev = process.env.NODE_ENV === 'development';

// Global API rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest || isDev,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Global request rate limit exceeded. Please try again later.'));
  },
});

// OTP Request rate limit by IP (5 per 15 min)
const otpRequestIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many OTP requests from this network. Try again later.'));
  },
});

// OTP Verify rate limit by IP (10 per 15 min in prod, 100 in dev)
const otpVerifyIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTest,
  handler: (req, res, next) => {
    next(ApiError.tooManyRequests('Too many OTP verification attempts. Please wait.'));
  },
});

// In-memory tracker for per-email limits (3 per 15 min + 30s cooldown)
const emailOtpTimestamps = new Map();

function otpEmailRateLimiter(req, res, next) {
  if (isTest) return next();

  const email = (req.body?.email || '').trim().toLowerCase();
  if (!email) return next();

  const now = Date.now();
  const record = emailOtpTimestamps.get(email) || { count: 0, firstRequest: now, lastRequest: 0 };

  // 30-second cooldown
  if (now - record.lastRequest < 30 * 1000) {
    const secondsRemaining = Math.ceil((30 * 1000 - (now - record.lastRequest)) / 1000);
    return next(
      ApiError.tooManyRequests(
        `Please wait ${secondsRemaining}s before requesting a new OTP.`,
        'OTP_COOLDOWN'
      )
    );
  }

  // Window reset after 15 minutes
  if (now - record.firstRequest > 15 * 60 * 1000) {
    record.count = 0;
    record.firstRequest = now;
  }

  // 3 requests per 15 minutes per email (50 in dev)
  const maxRequests = isDev ? 50 : 3;
  if (record.count >= maxRequests) {
    return next(
      ApiError.tooManyRequests(
        `Maximum ${maxRequests} OTP requests allowed per 15 minutes for this email.`,
        'EMAIL_LIMIT_REACHED'
      )
    );
  }

  record.count += 1;
  record.lastRequest = now;
  emailOtpTimestamps.set(email, record);

  next();
}

module.exports = {
  globalLimiter,
  otpRequestIpLimiter,
  otpVerifyIpLimiter,
  otpEmailRateLimiter,
};
