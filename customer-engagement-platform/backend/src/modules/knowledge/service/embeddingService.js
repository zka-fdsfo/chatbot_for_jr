const { tokenize } = require('../../../shared/helpers/tokenize');
const { CHUNK_SIZE_WORDS, CHUNK_OVERLAP_WORDS, EMBEDDING_DIMENSIONS } = require('../constants/rag');

// `content` is an arbitrary Mixed blob (KNOWLEDGE_BASE.md §6 — different
// shapes per category) — recursively collects every string/number leaf
// into a flat, space-joined text so it can be chunked/embedded uniformly
// regardless of category-specific structure.
function flattenValue(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(flattenValue).join(' ');
  if (typeof value === 'object') return Object.values(value).map(flattenValue).join(' ');
  return '';
}

// RAG.md §10-11: chunks should be "small, self-contained, meaningful,"
// 300-800 words with 50-100 words of overlap. Word-based, not
// character-based, per the doc's own units.
function chunkText(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks = [];
  const step = CHUNK_SIZE_WORDS - CHUNK_OVERLAP_WORDS;

  for (let start = 0; start < words.length; start += step) {
    const chunkWords = words.slice(start, start + CHUNK_SIZE_WORDS);
    chunks.push(chunkWords.join(' '));
    if (start + CHUNK_SIZE_WORDS >= words.length) break;
  }

  return chunks;
}

// A simple, deterministic string hash (djb2) — no crypto strength needed,
// just an even, stable distribution across EMBEDDING_DIMENSIONS buckets.
function hashToken(token) {
  let hash = 5381;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash * 33) ^ token.charCodeAt(i);
  }
  return Math.abs(hash);
}

function normalize(vector) {
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

// The Embedding Service. No embedding model or API is available in this
// project (Groq's integration here is chat-completion only — see
// IMPLEMENTATION_STATUS.md's Architecture Decisions), so this generates a
// fixed-dimension "hashing trick" vector instead: a standard, dependency-
// free technique (term-frequency counts hashed into fixed buckets, then
// L2-normalized) that captures lexical/token-overlap similarity, not true
// semantic similarity — an honest, documented limitation, not a hidden one.
function embed(text) {
  const vector = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const tokens = tokenize(text);

  tokens.forEach((token) => {
    const bucket = hashToken(token) % EMBEDDING_DIMENSIONS;
    vector[bucket] += 1;
  });

  return normalize(vector);
}

function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
  }
  // Both vectors are already L2-normalized by embed(), so the dot product
  // alone is the cosine similarity.
  return dot;
}

module.exports = { flattenValue, chunkText, embed, cosineSimilarity };
