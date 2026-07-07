const contextBuilder = require('./contextBuilder');
const responseParser = require('./responseParser');
const promptBuilder = require('../prompts/promptBuilder');
const providerManager = require('../providers/providerManager');
const aiSettingsService = require('../../settings/service/aiSettingsService');
const logger = require('../../../shared/logger/logger');

async function generateResponse({ message, category, visitor, conversationSummary, conversationHistory }) {
  const context = await contextBuilder.build({
    message,
    category,
    visitor,
    conversationSummary,
    conversationHistory,
  });

  const messages = await promptBuilder.build({
    knowledge: context.knowledge,
    conversationSummary: context.conversationSummary,
    recentMessages: context.conversationHistory,
    visitor: context.visitor,
    currentMessage: context.currentMessage,
  });

  // AI Settings (Phase 11) lets an admin tune these without a redeploy —
  // "Provider changes should not affect business logic" (ADMIN_PANEL.md §9),
  // so only the numeric/model knobs flow through here, not the pipeline
  // itself.
  const settings = await aiSettingsService.get();
  const provider = providerManager.getProvider();
  const rawResponse = await provider.generateCompletion({
    messages,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens,
    model: settings.model,
  });
  const parsed = responseParser.parse(rawResponse);

  if (!parsed.isValid) {
    logger.warn('AI response was empty or invalid; falling back to the fallback message.');
    return {
      ...parsed,
      content: await promptBuilder.getFallbackPrompt(),
      usedFallback: true,
      knowledgeUsed: context.knowledge.length,
    };
  }

  return { ...parsed, usedFallback: false, knowledgeUsed: context.knowledge.length };
}

module.exports = { generateResponse };
