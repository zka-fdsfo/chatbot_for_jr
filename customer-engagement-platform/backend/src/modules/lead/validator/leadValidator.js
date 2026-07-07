const Joi = require('joi');
const { LEAD_SOURCE, LEAD_SCORE, LEAD_STATUS } = require('../constants/lead');

const OBJECT_ID = Joi.string().hex().length(24);

const detectSchema = Joi.object({
  conversationId: Joi.string().required(),
});

const createLeadSchema = Joi.object({
  visitorId: Joi.string().allow(null),
  conversationId: Joi.string().allow(null),
  name: Joi.string().max(200).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().max(50).allow(null, ''),
  company: Joi.string().max(200).allow(null, ''),
  interestedServices: Joi.array().items(Joi.string()),
  notes: Joi.string().max(5000).allow(''),
  leadScore: Joi.string().valid(...Object.values(LEAD_SCORE)),
  source: Joi.string()
    .valid(...Object.values(LEAD_SOURCE))
    .required(),
});

const updateLeadSchema = Joi.object({
  name: Joi.string().max(200).allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  phone: Joi.string().max(50).allow(null, ''),
  company: Joi.string().max(200).allow(null, ''),
  interestedServices: Joi.array().items(Joi.string()),
  notes: Joi.string().max(5000).allow(''),
  leadScore: Joi.string().valid(...Object.values(LEAD_SCORE)),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(LEAD_STATUS))
    .required(),
});

const assignSchema = Joi.object({
  assignedExecutiveId: OBJECT_ID.required(),
});

const followUpSchema = Joi.object({
  scheduledAt: Joi.date().iso().allow(null),
  notes: Joi.string().max(2000).allow(null, ''),
  outcome: Joi.string().max(2000).allow(null, ''),
}).min(1);

const convertSchema = Joi.object({
  ticketId: OBJECT_ID.allow(null),
});

const markLostSchema = Joi.object({
  reason: Joi.string().max(1000).allow(null, ''),
});

const searchQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(LEAD_STATUS)),
  leadScore: Joi.string().valid(...Object.values(LEAD_SCORE)),
  assignedExecutiveId: OBJECT_ID,
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

module.exports = {
  detectSchema,
  createLeadSchema,
  updateLeadSchema,
  updateStatusSchema,
  assignSchema,
  followUpSchema,
  convertSchema,
  markLostSchema,
  searchQuerySchema,
};
