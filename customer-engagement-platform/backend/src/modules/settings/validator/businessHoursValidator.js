const Joi = require('joi');
const { DAYS_OF_WEEK, HOLIDAY_TYPE } = require('../constants/settings');

const daySchema = Joi.object({
  day: Joi.string()
    .valid(...DAYS_OF_WEEK)
    .required(),
  enabled: Joi.boolean().required(),
  open: Joi.string().required(),
  close: Joi.string().required(),
});

const updateBusinessHoursSchema = Joi.object({
  timezone: Joi.string(),
  weeklySchedule: Joi.array().items(daySchema).length(DAYS_OF_WEEK.length),
}).min(1);

const addHolidaySchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  date: Joi.string().required(),
  type: Joi.string().valid(...Object.values(HOLIDAY_TYPE)),
});

const callbackAvailabilityQuerySchema = Joi.object({
  proposedAt: Joi.date().iso(),
  count: Joi.number().integer().min(1).max(20),
});

module.exports = { updateBusinessHoursSchema, addHolidaySchema, callbackAvailabilityQuerySchema };
