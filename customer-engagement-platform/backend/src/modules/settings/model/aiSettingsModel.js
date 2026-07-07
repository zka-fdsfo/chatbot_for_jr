const mongoose = require('mongoose');
const { AI_PROVIDERS, RESPONSE_LENGTH } = require('../constants/settings');
const env = require('../../../config/env');

const aiSettingsSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: Object.values(AI_PROVIDERS),
      default: AI_PROVIDERS.GROQ,
    },
    model: {
      type: String,
      default: () => env.GROQ_MODEL,
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: () => env.AI_TEMPERATURE,
    },
    maxTokens: {
      type: Number,
      min: 1,
      default: () => env.AI_MAX_TOKENS,
    },
    responseLength: {
      type: String,
      enum: Object.values(RESPONSE_LENGTH),
      default: RESPONSE_LENGTH.MEDIUM,
    },
    confidenceThreshold: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.7,
    },
    escalationRules: {
      type: [String],
      default: [],
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

// Singleton document — only one AI Settings record should ever exist
// (ADMIN_PORTAL.md §9: "Provider changes should not affect business logic").
const AISettings = mongoose.model('AISettings', aiSettingsSchema, 'ai_settings');

module.exports = AISettings;
