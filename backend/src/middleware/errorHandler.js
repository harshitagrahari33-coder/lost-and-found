const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_ERROR';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    code = 'VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token';
    code = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired';
    code = 'TOKEN_EXPIRED';
  } else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate key conflict';
    code = 'DUPLICATE_CONFLICT';
  }

  // Only log detailed errors in non-production
  if (process.env.NODE_ENV !== 'production' && statusCode === 500) {
    console.error('[ERROR]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code,
  });
}

module.exports = errorHandler;
