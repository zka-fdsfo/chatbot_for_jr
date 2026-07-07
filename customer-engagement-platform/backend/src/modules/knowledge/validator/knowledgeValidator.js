const Joi = require('joi');
const { KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUS } = require('../constants/knowledge');

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createKnowledgeSchema = Joi.object({
  category: Joi.string()
    .valid(...Object.values(KNOWLEDGE_CATEGORIES))
    .required(),
  title: Joi.string().min(2).max(200).required(),
  slug: Joi.string().pattern(SLUG_PATTERN).required(),
  content: Joi.object().required(),
  keywords: Joi.array().items(Joi.string()).default([]),
});

const updateKnowledgeSchema = Joi.object({
  category: Joi.string().valid(...Object.values(KNOWLEDGE_CATEGORIES)),
  title: Joi.string().min(2).max(200),
  slug: Joi.string().pattern(SLUG_PATTERN),
  content: Joi.object(),
  keywords: Joi.array().items(Joi.string()),
}).min(1);

const searchQuerySchema = Joi.object({
  category: Joi.string().valid(...Object.values(KNOWLEDGE_CATEGORIES)),
  status: Joi.string().valid(...Object.values(KNOWLEDGE_STATUS)),
  keyword: Joi.string(),
  page: Joi.number().integer().min(1),
  limit: Joi.number().integer().min(1).max(100),
});

module.exports = { createKnowledgeSchema, updateKnowledgeSchema, searchQuerySchema };
