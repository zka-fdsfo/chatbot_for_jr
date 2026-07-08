const Joi = require('joi');

const updateProfileSchema = Joi.object({
  name: Joi.string().trim().max(200),
  email: Joi.string().trim().email().allow(null, ''),
  phone: Joi.string().trim().max(30).allow(null, ''),
  company: Joi.string().trim().max(200).allow(null, ''),
}).min(1);

module.exports = { updateProfileSchema };
