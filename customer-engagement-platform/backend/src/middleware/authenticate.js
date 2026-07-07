const { verifyAccessToken } = require('../shared/helpers/jwt');
const { AppError } = require('../shared/errors');
const { ACCOUNT_STATUS } = require('../shared/constants/roles');
const authService = require('../modules/auth/service/authService');
const catchAsync = require('../utils/catchAsync');

const authenticate = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Authentication required.', 401);
  }

  const token = header.slice('Bearer '.length);

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError('Invalid or expired access token.', 401);
  }

  const user = await authService.getById(payload.userId);

  if (!user.isActive || user.status !== ACCOUNT_STATUS.ACTIVE) {
    throw new AppError('Account is not active.', 403);
  }

  req.user = user;

  next();
});

module.exports = authenticate;
