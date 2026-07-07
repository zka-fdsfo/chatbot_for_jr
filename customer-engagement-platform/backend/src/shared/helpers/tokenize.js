const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'am',
  'what', 'when', 'where', 'who', 'why', 'how', 'which',
  'you', 'your', 'yours', 'i', 'me', 'my', 'we', 'our',
  'do', 'does', 'did', 'can', 'could', 'would', 'should', 'will',
  'to', 'of', 'in', 'on', 'at', 'for', 'and', 'or', 'but', 'with', 'about',
]);

// Shared by the AI Engine's Context Builder (keyword-pattern matching) and
// the Knowledge module's Embedding Service (hashing-trick vectors and
// keyword-overlap scoring) — one tokenization/stopword definition instead
// of two independently-drifting copies.
function tokenize(text) {
  return (text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turns free text into a regex-alternation pattern of its significant
// words (e.g. "What are your business hours?" -> "business|hours") — for
// matching against `knowledgeRepository.search`'s `$regex` keyword filter,
// which expects a pattern, not a literal phrase.
function toKeywordPattern(text) {
  const words = tokenize(text);
  if (words.length === 0) return null;
  return words.map(escapeRegExp).join('|');
}

module.exports = { tokenize, toKeywordPattern, STOPWORDS };
