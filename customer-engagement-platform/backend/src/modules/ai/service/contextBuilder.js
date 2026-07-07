const knowledgeService = require('../../knowledge/service/knowledgeService');
const env = require('../../../config/env');

async function build({ message, category, visitor, conversationSummary, conversationHistory = [] }) {
  // RAG.md §25: "All retrieval occurs through the Knowledge Service" — the
  // Retriever (vector + keyword hybrid search, ranked) lives entirely
  // behind this one call; the Context Builder's own interface is
  // unchanged (Phase 16 replaced the Retrieval Engine, not this module).
  const knowledge = await knowledgeService.retrieveForQuery(message, {
    category,
    limit: env.AI_KNOWLEDGE_LIMIT,
  });

  return {
    knowledge,
    visitor: visitor
      ? { name: visitor.name, email: visitor.email, preferredLanguage: visitor.preferredLanguage }
      : null,
    conversationSummary: conversationSummary ?? null,
    conversationHistory,
    currentMessage: message,
  };
}

module.exports = { build };
