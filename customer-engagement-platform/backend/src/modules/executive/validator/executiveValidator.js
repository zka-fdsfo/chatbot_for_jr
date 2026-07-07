const Joi = require('joi');
const { EXECUTIVE_STATUS } = require('../constants/executive');

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(EXECUTIVE_STATUS))
    .required(),
});

const listExecutivesQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(EXECUTIVE_STATUS)),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const createExecutiveSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(72).required(),
  department: Joi.string().max(100).allow(null, ''),
  maxChats: Joi.number().integer().min(1).max(50),
});

const updateExecutiveSchema = Joi.object({
  department: Joi.string().max(100).allow(null, ''),
  maxChats: Joi.number().integer().min(1).max(50),
}).min(1);

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).max(72).required(),
});

module.exports = {
  updateStatusSchema,
  listExecutivesQuerySchema,
  createExecutiveSchema,
  updateExecutiveSchema,
  resetPasswordSchema,
};
