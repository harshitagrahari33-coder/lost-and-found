const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateToken');
const { hashToken } = require('../utils/hashOtp');
const ApiError = require('../utils/ApiError');

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

async function issueTokenPair(user, existingFamily = null) {
  if (user.isSuspended) {
    throw ApiError.forbidden(
      `Account suspended: ${user.suspendedReason || 'Contact administration'}`,
      'ACCOUNT_SUSPENDED'
    );
  }

  const accessSecret = process.env.JWT_SECRET;
  const accessToken = generateAccessToken(user, accessSecret);

  const rawRefreshToken = generateRefreshToken();
  const tokenHash = hashToken(rawRefreshToken);
  const family = existingFamily || crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash,
    family,
    isRevoked: false,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

async function rotateRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw ApiError.unauthorized('Refresh token missing', 'TOKEN_MISSING');
  }

  const tokenHash = hashToken(rawRefreshToken);
  const tokenDoc = await RefreshToken.findOne({ tokenHash });

  if (!tokenDoc) {
    throw ApiError.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
  }

  // Token reuse detection!
  // If a revoked token is presented again, someone might have stolen it!
  // Revoke the entire family immediately to protect the user!
  if (tokenDoc.isRevoked) {
    await RefreshToken.updateMany({ family: tokenDoc.family }, { isRevoked: true });
    throw ApiError.unauthorized(
      'Suspicious activity detected. All sessions revoked. Please log in again.',
      'TOKEN_REUSE_DETECTED'
    );
  }

  // Check expiration
  if (new Date() > tokenDoc.expiresAt) {
    tokenDoc.isRevoked = true;
    await tokenDoc.save();
    throw ApiError.unauthorized('Refresh token expired. Please log in again.', 'REFRESH_TOKEN_EXPIRED');
  }

  // Verify user is not suspended or deleted
  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    throw ApiError.unauthorized('User not found', 'USER_NOT_FOUND');
  }

  if (user.isSuspended) {
    throw ApiError.forbidden('Account is suspended', 'ACCOUNT_SUSPENDED');
  }

  // Invalidate old token
  tokenDoc.isRevoked = true;
  await tokenDoc.save();

  // Issue new token pair within the same token family
  return issueTokenPair(user, tokenDoc.family);
}

async function revokeRefreshToken(rawRefreshToken) {
  if (!rawRefreshToken) return;
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.findOneAndUpdate({ tokenHash }, { isRevoked: true });
}

async function revokeAllUserTokens(userId) {
  await RefreshToken.updateMany({ userId }, { isRevoked: true });
}

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
};
