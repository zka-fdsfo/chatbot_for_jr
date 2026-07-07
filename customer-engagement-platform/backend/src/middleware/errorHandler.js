const { AppError } = require('../shared/errors');
const { sendError } = require('../shared/responses/apiResponse');
const logger = require('../shared/logger/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err instanceof AppError;
  const statusCode = isOperational ? err.statusCode : 500;
  const message = isOperational ? err.message : 'Internal server error';
  const errors = isOperational && err.details ? [].concat(err.details) : [];

  if (isOperational) {
    logger.warn(`${req.method} ${req.originalUrl} -> ${statusCode}: ${err.message}`);
  } else {
    logger.error(`${req.method} ${req.originalUrl} -> 500: ${err.message}`, { stack: err.stack });
  }

  return sendError(res, { statusCode, message, errors });
}

module.exports = errorHandler;
