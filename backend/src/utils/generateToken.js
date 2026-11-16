const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function generateAccessToken(user, secret = process.env.JWT_SECRET) {
  return jwt.sign(
    {
      id: user._id ? user._id.toString() : user.id,
      email: user.email,
      role: user.role,
      collegeId: user.collegeId,
    },
    secret,
    { expiresIn: '15m' }
  );
}

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
};
