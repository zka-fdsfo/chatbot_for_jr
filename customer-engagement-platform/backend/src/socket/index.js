const { Server } = require('socket.io');
const env = require('../config/env');
const logger = require('../shared/logger/logger');
const socketAuthenticate = require('./middleware/socketAuthenticate');
const registerChatEvents = require('./events/chatEvents');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('./constants/socketEvents');
const executiveService = require('../modules/executive/service/executiveService');
const { setIO } = require('./ioRegistry');

function initializeSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use(socketAuthenticate);

  io.on('connection', (socket) => {
    const identity = socket.data.user
      ? `user:${socket.data.user.id}`
      : `visitor:${socket.data.visitor.visitorId}`;

    logger.info(`Socket connected: ${socket.id} (${identity})`);

    if (socket.data.user) {
      socket.join(EXECUTIVES_ROOM);
      executiveService
        .markOnline(socket.data.user.id, socket.id)
        .then((executive) => {
          // The Availability control fetches status once via REST on mount,
          // which can race this write — tell it directly once the
          // socket-driven presence transition actually lands (same pattern
          // as VISITOR_TOKEN_RENEWED in chatEvents.js).
          socket.emit(SOCKET_EVENTS.EXECUTIVE_STATUS_UPDATED, { status: executive.status });
        })
        .catch((error) => {
          logger.warn(`Failed to mark executive online: ${error.message}`);
        });
    }

    registerChatEvents(io, socket);

    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (${reason})`);

      if (socket.data.user) {
        executiveService.markOffline(socket.data.user.id).catch((error) => {
          logger.warn(`Failed to mark executive offline: ${error.message}`);
        });
      }
    });
  });

  setIO(io);

  return io;
}

module.exports = initializeSocket;
