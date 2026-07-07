const mongoose = require('mongoose');

const conversationSummarySchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    visitorIntent: {
      type: String,
      default: null,
    },
    sentiment: {
      type: String,
      default: null,
    },
    outcome: {
      type: String,
      default: null,
    },
    followUpRecommendation: {
      type: String,
      default: null,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

conversationSummarySchema.index({ conversationId: 1 });

const ConversationSummary = mongoose.model(
  'ConversationSummary',
  conversationSummarySchema,
  'conversation_summaries',
);

module.exports = ConversationSummary;
