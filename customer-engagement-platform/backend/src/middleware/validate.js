const { ValidationError } = require('../shared/errors');

function validate(schema, property = 'body') {
  return function validateRequest(req, res, next) {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => detail.message);
      return next(new ValidationError('Validation failed', details));
    }

    req[property] = value;
    return next();
  };
}

module.exports = validate;
