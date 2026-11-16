const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { requestOtpSchema, verifyOtpSchema } = require('../utils/validators');
const {
  otpRequestIpLimiter,
  otpVerifyIpLimiter,
  otpEmailRateLimiter,
} = require('../middleware/rateLimiter');

router.post(
  '/request-otp',
  otpRequestIpLimiter,
  otpEmailRateLimiter,
  validateBody(requestOtpSchema),
  authController.handleRequestOtp
);

router.post(
  '/verify-otp',
  otpVerifyIpLimiter,
  validateBody(verifyOtpSchema),
  authController.handleVerifyOtp
);

router.post('/refresh', authController.handleRefresh);
router.post('/logout', authController.handleLogout);
router.get('/me', requireAuth, authController.handleGetMe);
router.patch('/profile', requireAuth, authController.handleUpdateProfile);

module.exports = router;
