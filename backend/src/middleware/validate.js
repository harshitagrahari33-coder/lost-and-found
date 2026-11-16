const ApiError = require('../utils/ApiError');

function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (err) {
      if (err.errors) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
      }
      next(ApiError.badRequest('Validation error', 'VALIDATION_ERROR'));
    }
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (err) {
      if (err.errors) {
        const message = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return next(ApiError.badRequest(message, 'VALIDATION_ERROR'));
      }
      next(ApiError.badRequest('Query validation error', 'VALIDATION_ERROR'));
    }
  };
}

module.exports = {
  validateBody,
  validateQuery,
};
