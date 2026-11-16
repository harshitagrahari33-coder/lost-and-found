const User = require('../models/User');
const ApiError = require('../utils/ApiError');

async function requireAdmin(req, res, next) {
  try {
    if (!req.user || !req.user._id) {
      throw ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED');
    }

    // Always re-verify role directly from the DATABASE, never trust token claims alone
    const dbUser = await User.findById(req.user._id);
    if (!dbUser || dbUser.role !== 'admin') {
      throw ApiError.forbidden('Administrator privileges required', 'ADMIN_ONLY');
    }

    if (dbUser.isSuspended) {
      throw ApiError.forbidden('Administrator account is suspended', 'ACCOUNT_SUSPENDED');
    }

    req.user = dbUser;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  requireAdmin,
};
