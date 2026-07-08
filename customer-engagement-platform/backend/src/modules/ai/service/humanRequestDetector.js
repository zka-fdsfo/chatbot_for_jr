// Deterministic, dependency-free detection of "the visitor wants to talk
// to a human" — deliberately not an LLM call: this is a yes/no signal
// that must never be wrong in the "no" direction due to a flaky model
// response, and doesn't need semantic nuance. Same "good enough, no
// external dependency" approach as this project's other lightweight
// classifiers (classifyUserAgent, the RAG hashing-trick embeddings).
const HUMAN_REQUEST_PATTERNS = [
  /\btalk(ing)? (to|with) (a |an |the )?(human|person|someone|agent|rep|representative|executive)\b/i,
  /\bspeak(ing)? (to|with) (a |an |the )?(human|person|someone|agent|rep|representative|executive)\b/i,
  /\bconnect(ing)? me (to|with) (a |an |the )?(human|person|someone|agent|rep|representative|executive)\b/i,
  /\b(human|live|real)\s*(agent|support|representative|rep|person|executive)\b/i,
  /\breal person\b/i,
  /\bcustomer (service|support) (rep|representative|agent)\b/i,
  /\bI want to (talk|speak) (to|with)\b/i,
  /\bcan (I|we) (talk|speak) (to|with) (someone|a human|an agent|a person|a representative|an executive)\b/i,
  /\btransfer me\b/i,
  /\bescalate (this|my (issue|question|request))\b/i,
];

function requestsHumanAgent(message) {
  const text = String(message ?? '');
  return HUMAN_REQUEST_PATTERNS.some((pattern) => pattern.test(text));
}

module.exports = { requestsHumanAgent };
