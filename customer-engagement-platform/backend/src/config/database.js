const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/logger/logger');

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connection established.');
});

mongoose.connection.on('error', (error) => {
  logger.error(`MongoDB connection error: ${error.message}`);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB connection lost.');
});

async function connectDatabase() {
  return mongoose.connect(env.MONGO_URI);
}

async function disconnectDatabase() {
  return mongoose.connection.close();
}

module.exports = { connectDatabase, disconnectDatabase };
