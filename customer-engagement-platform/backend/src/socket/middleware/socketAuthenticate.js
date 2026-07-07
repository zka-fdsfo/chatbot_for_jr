const { verifyAccessToken } = require('../../shared/helpers/jwt');
const authService = require('../../modules/auth/service/authService');
const visitorService = require('../../modules/visitor/service/visitorService');
const { ACCOUNT_STATUS } = require('../../shared/constants/roles');
const logger = require('../../shared/logger/logger');

async function socketAuthenticate(socket, next) {
  const { accessToken, visitorToken } = socket.handshake.auth || {};

  try {
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      const user = await authService.getById(payload.userId);

      if (!user.isActive || user.status !== ACCOUNT_STATUS.ACTIVE) {
        return next(new Error('Account is not active.'));
      }

      socket.data.user = user;
      return next();
    }

    if (visitorToken) {
      const { visitor, session, visitorToken: renewedToken } = await visitorService.restoreSession(visitorToken);
      socket.data.visitor = visitor;
      socket.data.visitorSession = session;
      socket.data.renewedVisitorToken = renewedToken;
      return next();
    }

    return next(new Error('Authentication required.'));
  } catch (error) {
    logger.warn(`Socket authentication failed: ${error.message}`);
    return next(new Error('Authentication failed.'));
  }
}

module.exports = socketAuthenticate;
