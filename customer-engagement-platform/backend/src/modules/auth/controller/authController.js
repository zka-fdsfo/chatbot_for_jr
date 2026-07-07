const authService = require('../service/authService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');
const { parseDurationToMs } = require('../../../shared/helpers/jwt');
const env = require('../../../config/env');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = `/api/${env.API_VERSION}/auth`;

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN),
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
}

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.login(email, password);

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, {
    message: 'Login successful.',
    data: { user, accessToken },
  });
});

const refresh = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  const { user, accessToken, refreshToken } = await authService.refresh(token);

  setRefreshCookie(res, refreshToken);

  return sendSuccess(res, {
    message: 'Token refreshed.',
    data: { user, accessToken },
  });
});

const logout = catchAsync(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logoutByRefreshToken(token);
  clearRefreshCookie(res);

  return sendSuccess(res, { message: 'Logged out successfully.' });
});

const me = catchAsync(async (req, res) => {
  return sendSuccess(res, { message: 'Current user.', data: { user: req.user } });
});

module.exports = { login, refresh, logout, me };
