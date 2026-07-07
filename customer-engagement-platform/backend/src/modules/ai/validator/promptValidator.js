const Joi = require('joi');
const { PROMPT_TYPES } = require('../constants/prompt');

const promptTypeParamSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(PROMPT_TYPES))
    .required(),
});

// Distinct from promptTypeParamSchema: the restore route's params include
// both `:type` and `:version` — validating with a schema that only knows
// about `type` would strip `version` out of req.params entirely (the
// `validate` middleware uses stripUnknown), turning it into NaN downstream.
const promptVersionParamSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(PROMPT_TYPES))
    .required(),
  version: Joi.number().integer().min(1).required(),
});

const updatePromptSchema = Joi.object({
  content: Joi.string().allow('').max(20000).required(),
});

module.exports = { promptTypeParamSchema, promptVersionParamSchema, updatePromptSchema };
