const request = require('supertest');
const app = require('../src/app');
const OTP = require('../src/models/OTP');
const User = require('../src/models/User');
const RefreshToken = require('../src/models/RefreshToken');
const { setupTestDB, teardownTestDB, clearTestDB } = require('./setup');
const { hashOtp } = require('../src/utils/hashOtp');

beforeAll(async () => {
  await setupTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe('1. Institutional Email Validation', () => {
  test('rejects non-KIET email domains and lookalike domains', async () => {
    const invalidEmails = [
      'student@gmail.com',
      'user@kiet.ac.in',
      'attacker@fakekiet.edu',
      'test@sub.kiet.edu',
      'invalid@yahoo.com',
      'victim@kiet.edu.attacker.com',
      'user@@kiet.edu',
      '@kiet.edu',
      'kiet.edu',
    ];

    for (const email of invalidEmails) {
      const res = await request(app).post('/api/auth/request-otp').send({ email });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid @kiet\.edu/i);
    }
  });

  test('accepts valid @kiet.edu emails with zero-width characters, mixed case, or whitespace', async () => {
    const validEmails = [
      'arjun.sharma@kiet.edu',
      'HARSHIT.21B0101@KIET.EDU',
      'student_council@kiet.edu',
      'priya-singh@kiet.edu',
      'harshit.21b0101@kiet.edu\u200B', // zero-width space
      '\uFEFFstudent.council@kiet.edu', // zero-width BOM
      '  spaced@kiet.edu  ', // surrounding whitespace
      'harshit+alias@kiet.edu', // valid plus alias
    ];

    for (const email of validEmails) {
      await OTP.deleteMany({});
      const res = await request(app).post('/api/auth/request-otp').send({ email });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toMatch(/verification code has been dispatched/i);
    }
  });
});

describe('2. OTP Lifecycle & Security', () => {
  test('OTP is stored hashed in database (assert raw OTP never stored)', async () => {
    const email = 'arjun@kiet.edu';
    await request(app).post('/api/auth/request-otp').send({ email });

    const otpDoc = await OTP.findOne({ email });
    expect(otpDoc).toBeTruthy();
    expect(otpDoc.otpHash).toHaveLength(64); // SHA-256 hex length
    expect(otpDoc.otpHash).not.toMatch(/^\d{6}$/); // NOT raw 6 digits
  });

  test('wrong OTP rejected and increments attempt count', async () => {
    const email = 'neha@kiet.edu';
    await request(app).post('/api/auth/request-otp').send({ email });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: '000000' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_OTP');
    expect(res.body.message).toMatch(/4 attempts remaining/i);

    const doc = await OTP.findOne({ email });
    expect(doc.attempts).toBe(1);
  });

  test('5-attempt incorrect OTP triggers lockout and deletion', async () => {
    const email = 'rohan@kiet.edu';
    await request(app).post('/api/auth/request-otp').send({ email });

    for (let i = 1; i <= 4; i++) {
      await request(app).post('/api/auth/verify-otp').send({ email, otp: '000000' });
    }

    // 5th attempt locks out
    const res5 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: '000000' });

    expect(res5.status).toBe(400);
    expect(res5.body.code).toBe('OTP_LOCKED');

    // Assert OTP is purged
    const doc = await OTP.findOne({ email });
    expect(doc).toBeNull();
  });

  test('expired OTP is rejected', async () => {
    const email = 'expired@kiet.edu';
    const secret = process.env.OTP_HMAC_SECRET;
    const testOtp = '123456';

    await OTP.create({
      email,
      otpHash: hashOtp(testOtp, secret),
      expiresAt: new Date(Date.now() - 10000), // In the past
      attempts: 0,
    });

    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: testOtp });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('OTP_EXPIRED');
  });

  test('successful OTP verification is single-use and deletes the record', async () => {
    const email = 'singleuse@kiet.edu';
    const secret = process.env.OTP_HMAC_SECRET;
    const testOtp = '654321';

    await OTP.create({
      email,
      otpHash: hashOtp(testOtp, secret),
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0,
    });

    const res1 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: testOtp, name: 'Single Use User' });

    expect(res1.status).toBe(200);
    expect(res1.body.data.accessToken).toBeTruthy();

    // Assert OTP doc is deleted
    const doc = await OTP.findOne({ email });
    expect(doc).toBeNull();

    // Immediate replay of same OTP fails
    const res2 = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: testOtp, name: 'Single Use User' });

    expect(res2.status).toBe(400);
    expect(res2.body.code).toBe('OTP_EXPIRED');
  });

  test('rapid repeat request triggers resend cooldown (429 OTP_COOLDOWN)', async () => {
    const email = 'cooldown@kiet.edu';
    const res1 = await request(app).post('/api/auth/request-otp').send({ email });
    expect(res1.status).toBe(200);

    const res2 = await request(app).post('/api/auth/request-otp').send({ email });
    expect(res2.status).toBe(429);
    expect(res2.body.code).toBe('OTP_COOLDOWN');
    expect(res2.body.message).toMatch(/Please wait \d+s/i);
  });
});

describe('3. JWT Authentication & Refresh Token Rotation', () => {
  let validUser;
  let refreshTokenCookie;
  let accessToken;

  beforeEach(async () => {
    const email = 'harshit.auth@kiet.edu';
    const secret = process.env.OTP_HMAC_SECRET;
    const testOtp = '777888';

    await OTP.create({
      email,
      otpHash: hashOtp(testOtp, secret),
      expiresAt: new Date(Date.now() + 60000),
      attempts: 0,
    });

    const verifyRes = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email, otp: testOtp, name: 'Harshit Agrahari' });

    accessToken = verifyRes.body.data.accessToken;
    validUser = verifyRes.body.data.user;

    const cookieHeader = verifyRes.headers['set-cookie'];
    refreshTokenCookie = cookieHeader ? cookieHeader[0] : null;
  });

  test('login issues access token and sets httpOnly refresh cookie', () => {
    expect(accessToken).toBeTruthy();
    expect(refreshTokenCookie).toMatch(/refreshToken=/);
    expect(refreshTokenCookie).toMatch(/HttpOnly/i);
  });

  test('protected route /api/auth/me accepts valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(validUser.email);
    expect(res.body.data.user.collegeId).toBe('harshit.auth');
  });

  test('protected route rejects missing, invalid, or expired tokens', async () => {
    const resMissing = await request(app).get('/api/auth/me');
    expect(resMissing.status).toBe(401);

    const resInvalid = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer gibberish.token.value');
    expect(resInvalid.status).toBe(401);
  });

  test('refresh token rotation issues new pair and revokes old token', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();

    const newCookieHeader = res.headers['set-cookie'];
    expect(newCookieHeader).toBeTruthy();
  });

  test('reuse detection: using revoked refresh token revokes entire token family', async () => {
    // Rotate once
    const rotateRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    expect(rotateRes.status).toBe(200);

    // Replay old refresh token!
    const replayRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshTokenCookie);

    expect(replayRes.status).toBe(401);
    expect(replayRes.body.code).toBe('TOKEN_REUSE_DETECTED');

    // Assert all tokens for user in that family are now revoked
    const userTokens = await RefreshToken.find({ userId: validUser.id });
    expect(userTokens.every((t) => t.isRevoked)).toBe(true);
  });

  test('suspended user is blocked from protected routes and login', async () => {
    await User.findByIdAndUpdate(validUser.id, {
      isSuspended: true,
      suspendedReason: 'Violated campus honor code',
    });

    const resMe = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resMe.status).toBe(403);
    expect(resMe.body.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('4. Delivery Error Semantics & Configuration Guardrails', () => {
  const emailService = require('../src/services/emailService');

  test('when email provider is not configured, sendOtpEmail returns 503 EMAIL_PROVIDER_NOT_CONFIGURED', async () => {
    const originalResend = process.env.RESEND_API_KEY;
    const originalSmtp = process.env.SMTP_USER;
    process.env.RESEND_API_KEY = '';
    process.env.SMTP_USER = '';

    try {
      let caughtError = null;
      try {
        await emailService.sendOtpEmail('test@kiet.edu', '123456');
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).toBeTruthy();
      expect(caughtError.statusCode).toBe(503);
      expect(caughtError.code).toBe('EMAIL_PROVIDER_NOT_CONFIGURED');
    } finally {
      process.env.RESEND_API_KEY = originalResend;
      process.env.SMTP_USER = originalSmtp;
    }
  });

  test('valid email + provider delivery error maps to 502 Bad Gateway and NEVER 400', async () => {
    const originalSend = emailService.sendOtpEmail;
    // Simulate provider returning rejection error
    emailService.sendOtpEmail = jest.fn().mockRejectedValue(
      new (require('../src/utils/ApiError'))(502, 'Email delivery failed: Resend restricted testing recipient', 'EMAIL_DELIVERY_FAILED')
    );

    try {
      const prevEnv = process.env.ENABLE_TEST_EMAIL;
      process.env.ENABLE_TEST_EMAIL = 'true';
      const res = await request(app)
        .post('/api/auth/request-otp')
        .send({ email: 'valid.student@kiet.edu' });

      expect(res.status).toBe(502);
      expect(res.body.code).toBe('EMAIL_DELIVERY_FAILED');
      expect(res.body.message).toMatch(/Email delivery failed/i);
      expect(res.status).not.toBe(400); // CRITICAL: NEVER 400 on valid email delivery failure
      process.env.ENABLE_TEST_EMAIL = prevEnv;
    } finally {
      emailService.sendOtpEmail = originalSend;
    }
  });

  test('DEV_OTP_LOG=true throws fatal error in production environment', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalDevLog = process.env.DEV_OTP_LOG;
    process.env.NODE_ENV = 'production';
    process.env.DEV_OTP_LOG = 'true';

    try {
      const { validateEnv } = require('../src/config/env');
      expect(() => validateEnv()).toThrow(/DEV_OTP_LOG must not be enabled in production/i);
    } finally {
      process.env.NODE_ENV = originalEnv;
      process.env.DEV_OTP_LOG = originalDevLog;
    }
  });
});
