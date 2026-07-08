const { AppError } = require('../shared/errors');
const { sendError } = require('../shared/responses/apiResponse');
const logger = require('../shared/logger/logger');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // A malformed request body (e.g. a bare `null`/`123` literal, which
  // express.json()'s strict mode rejects even though it's valid JSON) is
  // the client's mistake, not the server's — without this check it falls
  // through to the generic 500 below.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    logger.warn(`${req.method} ${req.originalUrl} -> 400: Malformed JSON body (${err.message})`);
    return sendError(res, { statusCode: 400, message: 'Malformed JSON in request body.', errors: [] });
  }

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
