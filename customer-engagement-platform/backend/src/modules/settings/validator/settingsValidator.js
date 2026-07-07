const Joi = require('joi');
const { AI_PROVIDERS, RESPONSE_LENGTH, WIDGET_THEME, WIDGET_POSITION } = require('../constants/settings');

const updateAISettingsSchema = Joi.object({
  provider: Joi.string().valid(...Object.values(AI_PROVIDERS)),
  model: Joi.string().min(1),
  temperature: Joi.number().min(0).max(2),
  maxTokens: Joi.number().integer().min(1),
  responseLength: Joi.string().valid(...Object.values(RESPONSE_LENGTH)),
  confidenceThreshold: Joi.number().min(0).max(1),
  escalationRules: Joi.array().items(Joi.string()),
}).min(1);

const updateWidgetSettingsSchema = Joi.object({
  brandLogoUrl: Joi.string().uri().allow(null, ''),
  primaryColor: Joi.string()
    .pattern(/^#[0-9a-fA-F]{6}$/)
    .messages({ 'string.pattern.base': 'primaryColor must be a hex color, e.g. #1976d2' }),
  theme: Joi.string().valid(...Object.values(WIDGET_THEME)),
  position: Joi.string().valid(...Object.values(WIDGET_POSITION)),
  welcomeMessage: Joi.string().min(1).max(500),
  suggestedQuestions: Joi.array().items(Joi.string().min(1).max(200)).max(10),
  offlineMessage: Joi.string().min(1).max(200),
  featureToggles: Joi.object({
    typingIndicatorEnabled: Joi.boolean(),
    soundNotificationsEnabled: Joi.boolean(),
    quickRepliesEnabled: Joi.boolean(),
    humanHandoffEnabled: Joi.boolean(),
  }),
}).min(1);

module.exports = { updateAISettingsSchema, updateWidgetSettingsSchema };
