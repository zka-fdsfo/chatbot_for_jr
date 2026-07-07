const crypto = require('crypto');
const userRepository = require('../repository/userRepository');
const { comparePassword, hashPassword } = require('../../../shared/helpers/password');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  parseDurationToMs,
} = require('../../../shared/helpers/jwt');
const { ACCOUNT_STATUS } = require('../../../shared/constants/roles');
const { AppError } = require('../../../shared/errors');
const env = require('../../../config/env');

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password.';
const INVALID_REFRESH_MESSAGE = 'Invalid or expired refresh token.';
const INACTIVE_ACCOUNT_MESSAGE = 'Account is not active. Contact an administrator.';

function toSafeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    isActive: user.isActive,
    lastLogin: user.lastLogin,
  };
}

function isAccountUsable(user) {
  return user.isActive && user.status === ACCOUNT_STATUS.ACTIVE;
}

async function issueSession(user) {
  const sessionId = crypto.randomUUID();
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    sessionId,
  });
  const refreshToken = signRefreshToken({ userId: user.id, sessionId });

  await userRepository.setRefreshSession(user.id, {
    refreshTokenHash: hashToken(refreshToken),
    refreshTokenExpiresAt: new Date(Date.now() + parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN)),
    sessionId,
  });

  return { accessToken, refreshToken };
}

class AuthService {
  async login(email, password) {
    const user = await userRepository.findByEmailWithSecrets(email);

    if (!user) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    const isPasswordValid = await comparePassword(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError(INVALID_CREDENTIALS_MESSAGE, 401);
    }

    if (!isAccountUsable(user)) {
      throw new AppError(INACTIVE_ACCOUNT_MESSAGE, 403);
    }

    const { accessToken, refreshToken } = await issueSession(user);
    await userRepository.recordLogin(user.id);

    return { user: toSafeUser(user), accessToken, refreshToken };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    const user = await userRepository.findByIdWithSecrets(payload.userId);

    const isKnownSession =
      user &&
      user.refreshTokenHash &&
      user.refreshTokenExpiresAt &&
      user.sessionId === payload.sessionId &&
      user.refreshTokenExpiresAt.getTime() >= Date.now() &&
      hashToken(refreshToken) === user.refreshTokenHash;

    if (!isKnownSession) {
      throw new AppError(INVALID_REFRESH_MESSAGE, 401);
    }

    if (!isAccountUsable(user)) {
      throw new AppError(INACTIVE_ACCOUNT_MESSAGE, 403);
    }

    const { accessToken, refreshToken: nextRefreshToken } = await issueSession(user);

    return { user: toSafeUser(user), accessToken, refreshToken: nextRefreshToken };
  }

  async logoutByRefreshToken(refreshToken) {
    if (!refreshToken) return;

    try {
      const payload = verifyRefreshToken(refreshToken);
      await userRepository.clearRefreshSession(payload.userId);
    } catch {
      // Token already invalid/expired — nothing to invalidate server-side.
    }
  }

  async getById(userId) {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toSafeUser(user);
  }

  // Below: admin-facing user management, backing Executive Management
  // (ADMIN_PANEL.md §11) — creating/deactivating/resetting an executive's
  // own login is a User-record concern, so it lives here rather than
  // duplicated into the `executive` module.
  async createUser({ name, email, password, role }) {
    const passwordHash = await hashPassword(password);

    try {
      const user = await userRepository.create({ name, email, passwordHash, role });
      return toSafeUser(user);
    } catch (error) {
      if (error.code === 11000) {
        throw new AppError('A user with this email already exists.', 409);
      }
      throw error;
    }
  }

  async setActive(userId, isActive) {
    const user = await userRepository.updateById(userId, { isActive });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toSafeUser(user);
  }

  async resetPassword(userId, newPassword) {
    const passwordHash = await hashPassword(newPassword);
    const user = await userRepository.updateById(userId, {
      passwordHash,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
      sessionId: null,
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return toSafeUser(user);
  }
}

module.exports = new AuthService();
