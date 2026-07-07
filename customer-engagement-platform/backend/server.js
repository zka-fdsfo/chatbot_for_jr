const http = require('http');
const app = require('./src/app');
const { connectDatabase, disconnectDatabase } = require('./src/config/database');
const env = require('./src/config/env');
const logger = require('./src/shared/logger/logger');
const initializeSocket = require('./src/socket');

const server = http.createServer(app);
initializeSocket(server);

async function start() {
  await connectDatabase();
  server.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });
}

async function shutdown(signal) {
  logger.info(`${signal} received. Shutting down gracefully.`);
  server.close(async () => {
    await disconnectDatabase();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});
