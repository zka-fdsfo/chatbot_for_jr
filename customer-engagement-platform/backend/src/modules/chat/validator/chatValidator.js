const Joi = require('joi');
const { CONVERSATION_STATUS } = require('../constants/chat');

const listConversationsQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(CONVERSATION_STATUS)),
  visitorId: Joi.string(),
  mine: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const paginationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(CONVERSATION_STATUS))
    .required(),
});

const reassignSchema = Joi.object({
  assignedExecutiveId: Joi.string().required(),
});

module.exports = {
  listConversationsQuerySchema,
  paginationQuerySchema,
  updateStatusSchema,
  reassignSchema,
};
