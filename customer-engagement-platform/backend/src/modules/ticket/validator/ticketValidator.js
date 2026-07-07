const Joi = require('joi');
const {
  TICKET_CATEGORIES,
  TICKET_PRIORITY,
  TICKET_STATUS,
  TICKET_SOURCE,
} = require('../constants/ticket');

const OBJECT_ID = Joi.string().hex().length(24);

const createTicketSchema = Joi.object({
  subject: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(5000).allow(''),
  category: Joi.string().valid(...Object.values(TICKET_CATEGORIES)),
  priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)),
  source: Joi.string()
    .valid(...Object.values(TICKET_SOURCE))
    .required(),
  conversationId: Joi.string().allow(null),
  visitorId: Joi.string().allow(null),
});

const updateTicketSchema = Joi.object({
  subject: Joi.string().min(2).max(200),
  description: Joi.string().max(5000).allow(''),
  category: Joi.string().valid(...Object.values(TICKET_CATEGORIES)),
  priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(...Object.values(TICKET_STATUS))
    .required(),
});

const assignSchema = Joi.object({
  assignedExecutiveId: OBJECT_ID.required(),
});

const addNoteSchema = Joi.object({
  content: Joi.string().min(1).max(5000).required(),
});

const searchQuerySchema = Joi.object({
  status: Joi.string().valid(...Object.values(TICKET_STATUS)),
  priority: Joi.string().valid(...Object.values(TICKET_PRIORITY)),
  category: Joi.string().valid(...Object.values(TICKET_CATEGORIES)),
  assignedExecutiveId: OBJECT_ID,
  visitorId: Joi.string(),
  ticketNumber: Joi.string(),
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  includeDeleted: Joi.boolean(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

module.exports = {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  assignSchema,
  addNoteSchema,
  searchQuerySchema,
};
