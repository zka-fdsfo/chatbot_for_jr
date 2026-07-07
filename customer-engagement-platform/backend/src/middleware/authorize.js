const { AppError } = require('../shared/errors');
const { hasPermission } = require('../shared/constants/permissions');

const FORBIDDEN_MESSAGE = 'You do not have permission to perform this action.';

function requireRole(...allowedRoles) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new AppError(FORBIDDEN_MESSAGE, 403));
    }

    return next();
  };
}

function requirePermission(permission) {
  return function requirePermissionMiddleware(req, res, next) {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return next(new AppError(FORBIDDEN_MESSAGE, 403));
    }

    return next();
  };
}

module.exports = { requireRole, requirePermission };
