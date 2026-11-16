const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw ApiError.unauthorized('Authentication token missing', 'TOKEN_MISSING');
    }

    const secret = process.env.JWT_SECRET;
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Access token expired', 'TOKEN_EXPIRED');
      }
      throw ApiError.unauthorized('Invalid access token', 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('User not found or deleted', 'USER_NOT_FOUND');
    }

    if (user.isSuspended) {
      throw ApiError.forbidden(
        `Account suspended: ${user.suspendedReason || 'Contact administration'}`,
        'ACCOUNT_SUSPENDED'
      );
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Optional auth for public views that provide extra info to authenticated users
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user && !user.isSuspended) {
          req.user = user;
        }
      }
    }
  } catch {
    // Silently continue without authenticated user
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
};
