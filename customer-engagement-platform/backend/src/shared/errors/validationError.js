const AppError = require('./appError');

class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, details);
  }
}

module.exports = ValidationError;
