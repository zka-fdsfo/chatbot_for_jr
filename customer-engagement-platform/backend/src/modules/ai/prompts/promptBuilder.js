const fs = require('fs');
const path = require('path');
const promptService = require('../service/promptService');
const { PROMPT_TYPES } = require('../constants/prompt');

const MAX_MESSAGE_LENGTH = 4000;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS_PATTERN = new RegExp('[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]', 'g');

function loadTemplate(name) {
  return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf8').trim();
}

const SYSTEM_PROMPT = loadTemplate('system.md');
const DEVELOPER_PROMPT = loadTemplate('developer.md');
const FALLBACK_PROMPT = loadTemplate('fallback.md');

// Prompt Management (Phase 11) lets an admin publish a replacement for
// these without a redeploy. Each lookup falls back to the original
// file-based constant above if nothing's been published — the file
// templates remain the ground truth default, never removed.
async function resolvePrompt(type, fileDefault) {
  const published = await promptService.getPublishedContent(type);
  return published ?? fileDefault;
}

function sanitizeMessage(text) {
  return String(text ?? '')
    .replace(CONTROL_CHARACTERS_PATTERN, '')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH);
}

function formatKnowledge(knowledge = []) {
  if (knowledge.length === 0) {
    return 'No matching company knowledge was found for this request.';
  }

  return knowledge
    .map((doc) => `### ${doc.title} (${doc.category})\n${JSON.stringify(doc.content)}`)
    .join('\n\n');
}

function formatVisitorContext(visitor) {
  if (!visitor) return null;

  const fields = ['name', 'email', 'preferredLanguage']
    .filter((field) => visitor[field])
    .map((field) => `${field}: ${visitor[field]}`);

  return fields.length > 0 ? `Visitor context — ${fields.join(', ')}` : null;
}

async function build({ knowledge = [], conversationSummary, recentMessages = [], visitor, currentMessage }) {
  const [systemPrompt, developerPrompt] = await Promise.all([
    resolvePrompt(PROMPT_TYPES.SYSTEM, SYSTEM_PROMPT),
    resolvePrompt(PROMPT_TYPES.DEVELOPER, DEVELOPER_PROMPT),
  ]);

  const systemContent = [
    systemPrompt,
    developerPrompt,
    `Company knowledge:\n${formatKnowledge(knowledge)}`,
  ].join('\n\n');

  const messages = [{ role: 'system', content: systemContent }];

  if (conversationSummary) {
    messages.push({ role: 'system', content: `Conversation summary so far: ${conversationSummary}` });
  }

  const visitorContext = formatVisitorContext(visitor);
  if (visitorContext) {
    messages.push({ role: 'system', content: visitorContext });
  }

  recentMessages.forEach((entry) => {
    messages.push({ role: entry.role, content: sanitizeMessage(entry.content) });
  });

  messages.push({ role: 'user', content: sanitizeMessage(currentMessage) });

  return messages;
}

async function getFallbackPrompt() {
  return resolvePrompt(PROMPT_TYPES.FALLBACK, FALLBACK_PROMPT);
}

module.exports = { build, sanitizeMessage, FALLBACK_PROMPT, getFallbackPrompt };
