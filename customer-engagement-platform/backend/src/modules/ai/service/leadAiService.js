const fs = require('fs');
const path = require('path');
const messageService = require('../../chat/service/messageService');
const providerManager = require('../providers/providerManager');
const promptService = require('./promptService');
const responseParser = require('./responseParser');
const { PROMPT_TYPES } = require('../constants/prompt');
const { sanitizeMessage } = require('../prompts/promptBuilder');
const { AppError } = require('../../../shared/errors');

const LEAD_PROMPT = fs
  .readFileSync(path.join(__dirname, '..', 'prompts', 'templates', 'lead.md'), 'utf8')
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

async function getTranscript(conversationId) {
  const { items: messages } = await messageService.listByConversation(conversationId, {
    limit: 200,
    sort: 'sentAt',
  });

  if (messages.length === 0) {
    throw new AppError('Cannot analyze a conversation with no messages.', 400);
  }

  return formatTranscript(messages);
}

async function resolveLeadPrompt() {
  // Prompt Management (Phase 11) seeded a "LEAD" prompt slot with no
  // consumer at the time — this is that consumer. Falls back to the
  // file template if nothing's been published, same pattern as every
  // other prompt type.
  return (await promptService.getPublishedContent(PROMPT_TYPES.LEAD)) ?? LEAD_PROMPT;
}

async function callForJson(systemPrompt, userPrompt) {
  const provider = providerManager.getProvider();

  // Fixed, low temperature — like summaryService, this needs reliable
  // strict-JSON output, not the admin-configurable chat temperature
  // (AI Settings governs conversational replies, not structured analysis).
  const rawResponse = await provider.generateCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
  });

  const parsed = responseParser.parse(rawResponse);

  if (!parsed.isValid) {
    throw new AppError('The AI provider returned an empty response.', 502);
  }

  return parsed.content;
}

function safeJsonParse(content) {
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

class LeadAiService {
  // LEAD_MANAGEMENT.md §7, §10 — determines whether a visitor is a
  // qualified lead and extracts whatever contact info they volunteered.
  // Never persisted by this call — the executive reviews and decides
  // whether to actually create the lead (LEAD_MANAGEMENT.md §22:
  // "Executives remain responsible for final qualification").
  async detectFromConversation(conversationId) {
    const transcript = await getTranscript(conversationId);
    const systemPrompt = await resolveLeadPrompt();

    const userPrompt = `Analyze this conversation transcript and determine whether the visitor is a qualified sales lead.

Transcript:
${transcript}

Respond with ONLY a JSON object (no surrounding text, no Markdown code fences) with exactly these keys:
{
  "isQualifiedLead": true or false,
  "leadScore": "HOT" or "WARM" or "COLD",
  "confidenceLevel": "HIGH" or "MEDIUM" or "LOW",
  "extractedInfo": { "name": string or null, "email": string or null, "phone": string or null, "company": string or null },
  "interestedServices": [array of strings, may be empty],
  "reasoning": "a brief explanation of why this is or isn't a qualified lead"
}`;

    const content = await callForJson(systemPrompt, userPrompt);
    const parsed = safeJsonParse(content);

    if (!parsed) {
      return {
        isQualifiedLead: false,
        leadScore: 'COLD',
        confidenceLevel: 'LOW',
        extractedInfo: { name: null, email: null, phone: null, company: null },
        interestedServices: [],
        reasoning: 'The AI response could not be parsed as structured data.',
      };
    }

    return {
      isQualifiedLead: Boolean(parsed.isQualifiedLead),
      leadScore: parsed.leadScore ?? 'COLD',
      confidenceLevel: parsed.confidenceLevel ?? 'LOW',
      extractedInfo: {
        name: parsed.extractedInfo?.name ?? null,
        email: parsed.extractedInfo?.email ?? null,
        phone: parsed.extractedInfo?.phone ?? null,
        company: parsed.extractedInfo?.company ?? null,
      },
      interestedServices: Array.isArray(parsed.interestedServices) ? parsed.interestedServices : [],
      reasoning: parsed.reasoning ?? '',
    };
  }

  // LEAD_MANAGEMENT.md §11 — "AI Qualification Summary," generated
  // on-demand for an existing lead (a "Generate Summary" action), never
  // automatically — same pattern Phase 10 established for conversation
  // summaries.
  async generateQualificationSummary(conversationId) {
    const transcript = await getTranscript(conversationId);
    const systemPrompt = await resolveLeadPrompt();

    const userPrompt = `Analyze this conversation transcript and produce a qualification summary for the executive managing this lead.

Transcript:
${transcript}

Respond with ONLY a JSON object (no surrounding text, no Markdown code fences) with exactly these keys:
{
  "summary": "a brief factual summary of the conversation",
  "visitorIntent": "the visitor's main goal or question, in a few words",
  "interestedServices": [array of strings, may be empty],
  "recommendedFollowUp": "a brief, actionable recommendation for the executive, or null if none",
  "confidenceLevel": "HIGH" or "MEDIUM" or "LOW"
}`;

    const content = await callForJson(systemPrompt, userPrompt);
    const parsed = safeJsonParse(content);

    if (!parsed) {
      return {
        summary: content,
        visitorIntent: null,
        interestedServices: [],
        recommendedFollowUp: null,
        confidenceLevel: 'LOW',
      };
    }

    return {
      summary: parsed.summary ?? content,
      visitorIntent: parsed.visitorIntent ?? null,
      interestedServices: Array.isArray(parsed.interestedServices) ? parsed.interestedServices : [],
      recommendedFollowUp: parsed.recommendedFollowUp ?? null,
      confidenceLevel: parsed.confidenceLevel ?? 'LOW',
    };
  }
}

module.exports = new LeadAiService();
