const User = require('../models/User');
const { requestOtp, verifyOtp } = require('../services/otpService');
const { issueTokenPair, rotateRefreshToken, revokeRefreshToken } = require('../services/tokenService');
const { extractCollegeId } = require('../utils/validators');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const xss = require('xss');

function getCookieOptions(req) {
  const isHttps = Boolean(
    req?.secure ||
    req?.headers?.['x-forwarded-proto'] === 'https' ||
    process.env.NODE_ENV === 'production'
  );
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

const handleRequestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await requestOtp(email);
  res.status(200).json({
    success: true,
    data: result,
  });
});

const handleVerifyOtp = asyncHandler(async (req, res) => {
  const { email, otp, name } = req.body;
  const normalizedEmail = email ? email.trim().toLowerCase() : '';
  let user = await User.findOne({ email: normalizedEmail });

  // Only consume OTP if an existing user is logging in, or if name is supplied to complete signup
  const shouldConsume = Boolean(user || (name && name.trim()));
  const { email: verifiedEmail } = await verifyOtp(email, otp, { consume: shouldConsume });

  if (!user) {
    user = await User.findOne({ email: verifiedEmail });
  }

  // First-time user signup flow
  if (!user) {
    if (!name || !name.trim()) {
      return res.status(200).json({
        success: true,
        data: {
          needsName: true,
          email: verifiedEmail,
          message: 'OTP verified. Please provide your full name to finalize registration.',
        },
      });
    }

    const collegeId = extractCollegeId(verifiedEmail);
    const sanitizedName = xss(name.trim());

    user = await User.create({
      name: sanitizedName,
      email: verifiedEmail,
      collegeId,
      role: 'student',
      isVerified: true,
    });
  }

  if (user.isSuspended) {
    throw ApiError.forbidden(
      `Your account is suspended: ${user.suspendedReason || 'Contact campus administration.'}`,
      'ACCOUNT_SUSPENDED'
    );
  }

  user.lastLoginAt = new Date();
  await user.save();

  const { accessToken, refreshToken } = await issueTokenPair(user);

  res.cookie('refreshToken', refreshToken, getCookieOptions(req));

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        collegeId: user.collegeId,
        avatar: user.avatar,
        role: user.role,
      },
      accessToken,
    },
  });
});

const handleRefresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (!rawToken) {
    throw ApiError.unauthorized('Refresh token cookie missing', 'NO_REFRESH_TOKEN');
  }

  const { accessToken, refreshToken: newRefreshToken } = await rotateRefreshToken(rawToken);

  res.cookie('refreshToken', newRefreshToken, getCookieOptions(req));

  res.status(200).json({
    success: true,
    data: {
      accessToken,
    },
  });
});

const handleLogout = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  if (rawToken) {
    await revokeRefreshToken(rawToken);
  }

  res.clearCookie('refreshToken', {
    ...getCookieOptions(req),
    maxAge: 0,
  });

  res.status(200).json({
    success: true,
    data: { message: 'Successfully logged out' },
  });
});

const handleGetMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        collegeId: req.user.collegeId,
        avatar: req.user.avatar,
        role: req.user.role,
        createdAt: req.user.createdAt,
      },
    },
  });
});

const handleUpdateProfile = asyncHandler(async (req, res) => {
  const { name, avatar } = req.body;
  const user = await User.findById(req.user._id);
  if (!user) {
    throw ApiError.notFound('User not found', 'USER_NOT_FOUND');
  }

  if (name && typeof name === 'string') {
    user.name = xss(name.trim());
  }

  if (avatar && typeof avatar === 'string') {
    user.avatar = avatar.trim();
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        collegeId: user.collegeId,
        avatar: user.avatar,
        role: user.role,
        createdAt: user.createdAt,
      },
    },
  });
});

module.exports = {
  handleRequestOtp,
  handleVerifyOtp,
  handleRefresh,
  handleLogout,
  handleGetMe,
  handleUpdateProfile,
};
