const knowledgeEmbeddingRepository = require('../repository/knowledgeEmbeddingRepository');
const embeddingService = require('./embeddingService');
const { tokenize } = require('../../../shared/helpers/tokenize');
const { RANKING_WEIGHTS, FRESHNESS_HALF_LIFE_DAYS } = require('../constants/rag');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function keywordOverlapScore(queryTokens, chunkText) {
  if (queryTokens.size === 0) return 0;

  const chunkTokens = new Set(tokenize(chunkText));
  let matches = 0;
  queryTokens.forEach((token) => {
    if (chunkTokens.has(token)) matches += 1;
  });

  return matches / queryTokens.size;
}

function freshnessScore(createdAt) {
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / MS_PER_DAY;
  return Math.max(0, 1 - ageDays / FRESHNESS_HALF_LIFE_DAYS);
}

// Hybrid Search (RAG.md §13 Phase 3): combines vector similarity, keyword
// overlap, and metadata filtering. Metadata filtering (category) already
// happened at candidate-fetch time (knowledgeEmbeddingRepository.
// findCandidates); this scores the remaining two factors per chunk.
function hybridSearch(candidates, queryVector, queryTokens) {
  return candidates.map((chunk) => ({
    chunk,
    vectorScore: embeddingService.cosineSimilarity(queryVector, chunk.embedding),
    keywordScore: keywordOverlapScore(queryTokens, chunk.text),
  }));
}

// Context Ranking (RAG.md §14): combines the hybrid scores with a
// Freshness factor into one ranked list. Popularity and Business Priority
// (also listed in §14) are omitted — no data source exists for either.
function rankAndSelect(scoredChunks, limit) {
  const ranked = scoredChunks
    .map((entry) => ({
      ...entry,
      combinedScore:
        entry.vectorScore * RANKING_WEIGHTS.VECTOR_SIMILARITY +
        entry.keywordScore * RANKING_WEIGHTS.KEYWORD_OVERLAP +
        freshnessScore(entry.chunk.createdAt) * RANKING_WEIGHTS.FRESHNESS,
    }))
    .sort((a, b) => b.combinedScore - a.combinedScore);

  // One result per parent document — the query may match several chunks
  // of the same doc, but the Context Builder wants distinct knowledge
  // items, not repeated near-duplicates of the same source.
  const seenKnowledgeIds = new Set();
  const selected = [];

  for (const entry of ranked) {
    const knowledgeId = String(entry.chunk.knowledgeId);
    if (seenKnowledgeIds.has(knowledgeId)) continue;
    seenKnowledgeIds.add(knowledgeId);
    selected.push(entry);
    if (selected.length >= limit) break;
  }

  return selected;
}

class RetrieverService {
  async hasEmbeddings() {
    const count = await knowledgeEmbeddingRepository.countAll();
    return count > 0;
  }

  // The Retriever. RAG.md §16: only the matched chunk's own text is
  // returned as `content` (not the parent document's full content) —
  // minimizing prompt size, since the whole point of chunking is to hand
  // the AI only the relevant slice, not everything the document contains.
  async retrieve(query, { category, limit = 3 } = {}) {
    const candidates = await knowledgeEmbeddingRepository.findCandidates({ category });
    if (candidates.length === 0) return [];

    const queryVector = embeddingService.embed(query);
    const queryTokens = new Set(tokenize(query));

    const scored = hybridSearch(candidates, queryVector, queryTokens);
    const selected = rankAndSelect(scored, limit);

    return selected.map(({ chunk }) => ({
      category: chunk.category,
      title: chunk.title,
      content: chunk.text,
      keywords: chunk.keywords,
    }));
  }
}

module.exports = new RetrieverService();
