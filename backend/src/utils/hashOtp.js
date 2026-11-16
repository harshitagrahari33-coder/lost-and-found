const crypto = require('crypto');

function generateOtpDigits() {
  // 6 digits cryptographically secure: 100000 - 999999
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

function hashOtp(otp, secret) {
  if (!otp || !secret) {
    throw new Error('OTP and secret are required for hashing');
  }
  return crypto.createHmac('sha256', secret).update(otp.toString()).digest('hex');
}

function verifyOtpHash(inputOtp, storedHash, secret) {
  if (!inputOtp || !storedHash || !secret) return false;
  const inputHash = hashOtp(inputOtp, secret);
  const bufA = Buffer.from(inputHash, 'hex');
  const bufB = Buffer.from(storedHash, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = {
  generateOtpDigits,
  hashOtp,
  verifyOtpHash,
  hashToken,
};
