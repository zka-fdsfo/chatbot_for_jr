const fs = require('fs');
const path = require('path');
const conversationSummaryRepository = require('../repository/conversationSummaryRepository');
const messageService = require('../../chat/service/messageService');
const providerManager = require('../providers/providerManager');
const promptService = require('./promptService');
const { PROMPT_TYPES } = require('../constants/prompt');
const responseParser = require('./responseParser');
const { sanitizeMessage } = require('../prompts/promptBuilder');
const { AppError } = require('../../../shared/errors');

const SUMMARY_PROMPT = fs
  .readFileSync(path.join(__dirname, '..', 'prompts', 'templates', 'summary.md'), 'utf8')
  .trim();

const SENDER_LABEL = {
  VISITOR: 'Visitor',
  EXECUTIVE: 'Executive',
  AI: 'AI Assistant',
  SYSTEM: 'System',
};

function formatTranscript(messages) {
  return messages
    .map((message) => `${SENDER_LABEL[message.senderType] ?? message.senderType}: ${sanitizeMessage(message.message)}`)
    .join('\n');
}

function parseSummaryResponse(content) {
  try {
    const parsed = JSON.parse(content);
    return {
      summary: parsed.summary ?? content,
      visitorIntent: parsed.visitorIntent ?? null,
      sentiment: parsed.sentiment ?? null,
      outcome: parsed.outcome ?? null,
      followUpRecommendation: parsed.followUpRecommendation ?? null,
    };
  } catch {
    return {
      summary: content,
      visitorIntent: null,
      sentiment: null,
      outcome: null,
      followUpRecommendation: null,
    };
  }
}

class SummaryService {
  async generate(conversationId) {
    const { items: messages } = await messageService.listByConversation(conversationId, {
      limit: 200,
      sort: 'sentAt',
    });

    if (messages.length === 0) {
      throw new AppError('Cannot summarize a conversation with no messages.', 400);
    }

    // Prompt Management (Phase 11) lets an admin publish a replacement
    // summary prompt without a redeploy; falls back to the file template
    // if nothing's been published. Temperature stays fixed and low here
    // (not the admin-configurable AI Settings temperature) — this call
    // needs reliable strict-JSON output, not conversational creativity.
    const summaryPrompt = (await promptService.getPublishedContent(PROMPT_TYPES.SUMMARY)) ?? SUMMARY_PROMPT;

    const provider = providerManager.getProvider();
    const rawResponse = await provider.generateCompletion({
      messages: [
        { role: 'system', content: summaryPrompt },
        { role: 'user', content: formatTranscript(messages) },
      ],
      temperature: 0.2,
    });

    const parsed = responseParser.parse(rawResponse);

    if (!parsed.isValid) {
      throw new AppError('The AI provider returned an empty summary.', 502);
    }

    const fields = parseSummaryResponse(parsed.content);

    return conversationSummaryRepository.create({
      conversationId,
      ...fields,
      generatedAt: new Date(),
    });
  }

  async getLatest(conversationId) {
    return conversationSummaryRepository.findLatestByConversationId(conversationId);
  }
}

module.exports = new SummaryService();
