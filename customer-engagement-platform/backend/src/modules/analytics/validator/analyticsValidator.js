const Joi = require('joi');
const { CLIENT_EVENT_TYPES, DATE_RANGE } = require('../constants/analytics');

const rangeQuerySchema = Joi.object({
  range: Joi.string().valid(...Object.values(DATE_RANGE)),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});

const executiveMetricsQuerySchema = rangeQuerySchema.keys({
  executiveUserId: Joi.string(),
});

// Only the four visitor-driven event types may be submitted directly by a
// browser — everything else is recorded server-side as a side effect of an
// authenticated/internal operation (see constants/analytics.js).
const recordEventSchema = Joi.object({
  type: Joi.string()
    .valid(...CLIENT_EVENT_TYPES)
    .required(),
  payload: Joi.object().max(10).default({}),
});

module.exports = { rangeQuerySchema, executiveMetricsQuerySchema, recordEventSchema };
