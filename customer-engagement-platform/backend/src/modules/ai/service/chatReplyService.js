const messageService = require('../../chat/service/messageService');
const conversationSummaryRepository = require('../repository/conversationSummaryRepository');
const visitorService = require('../../visitor/service/visitorService');
const aiEngine = require('./aiEngine');
const promptBuilder = require('../prompts/promptBuilder');
const { requestsHumanAgent } = require('./humanRequestDetector');
const { SENDER_TYPE, MESSAGE_TYPE } = require('../../chat/constants/chat');
const logger = require('../../../shared/logger/logger');

const HISTORY_FETCH_LIMIT = 21;

// Only VISITOR/EXECUTIVE/AI map onto the LLM's user/assistant roles;
// SYSTEM messages (e.g. a future "conversation ended" system note) are
// dropped from the prompt rather than force-mapped into either role.
const HISTORY_ROLE = {
  [SENDER_TYPE.VISITOR]: 'user',
  [SENDER_TYPE.EXECUTIVE]: 'assistant',
  [SENDER_TYPE.AI]: 'assistant',
};

async function buildConversationHistory(conversationId, excludeMessageId) {
  const { items } = await messageService.listByConversation(conversationId, {
    limit: HISTORY_FETCH_LIMIT,
    sort: '-sentAt',
  });

  return items
    .slice()
    .reverse()
    .filter((entry) => String(entry.id) !== String(excludeMessageId))
    .filter((entry) => HISTORY_ROLE[entry.senderType])
    .map((entry) => ({ role: HISTORY_ROLE[entry.senderType], content: entry.message }));
}

async function resolveVisitor(visitorId) {
  try {
    return await visitorService.getByVisitorId(visitorId);
  } catch {
    return null;
  }
}

class ChatReplyService {
  // ARCHITECTURE.md §10 (AI Request Lifecycle): builds context from this
  // conversation's own history/summary/visitor, calls the AI Engine (Phase
  // 7 — fully built, only ever exercised by on-demand summaries/lead
  // detection until this), and persists the result as a real
  // SENDER_TYPE.AI message. Returns `usedFallback`/`visitorRequestedHuman`
  // so the caller (chatEvents.js) knows whether to also escalate to a
  // support ticket — "If AI cannot resolve, or the visitor asks for a
  // human, escalate."
  async generateReply(conversation, triggeringMessage) {
    // Checked first, deterministically, before ever calling the LLM — an
    // explicit "let me talk to a human" doesn't need (and shouldn't wait
    // on, or risk being reworded unpredictably by) a model call.
    const visitorRequestedHuman = requestsHumanAgent(triggeringMessage.message);

    if (visitorRequestedHuman) {
      const message = await messageService.send({
        conversationId: conversation.conversationId,
        senderType: SENDER_TYPE.AI,
        senderId: null,
        message: await promptBuilder.getEscalationPrompt(),
        messageType: MESSAGE_TYPE.TEXT,
      });

      return { message, usedFallback: false, visitorRequestedHuman: true, visitor: await resolveVisitor(conversation.visitorId) };
    }

    const [conversationHistory, latestSummary, visitor] = await Promise.all([
      buildConversationHistory(conversation.conversationId, triggeringMessage.id),
      conversationSummaryRepository.findLatestByConversationId(conversation.conversationId),
      resolveVisitor(conversation.visitorId),
    ]);

    let content;
    let usedFallback;

    try {
      const result = await aiEngine.generateResponse({
        message: triggeringMessage.message,
        category: undefined,
        visitor,
        conversationSummary: latestSummary?.summary ?? null,
        conversationHistory,
      });
      content = result.content;
      usedFallback = result.usedFallback;
    } catch (error) {
      // The provider is unreachable/unconfigured/erroring (e.g. missing
      // GROQ_API_KEY, a 502 from Groq) — reuse the same fallback copy
      // aiEngine itself falls back to on an empty completion, rather than
      // leaving the visitor with no reply at all. CLAUDE.md's AI Rules:
      // "Escalate to a human when required."
      logger.warn(`AI reply generation failed for conversation ${conversation.conversationId}: ${error.message}`);
      content = await promptBuilder.getFallbackPrompt();
      usedFallback = true;
    }

    const message = await messageService.send({
      conversationId: conversation.conversationId,
      senderType: SENDER_TYPE.AI,
      senderId: null,
      message: content,
      messageType: MESSAGE_TYPE.TEXT,
    });

    return { message, usedFallback, visitorRequestedHuman: false, visitor };
  }
}

module.exports = new ChatReplyService();
