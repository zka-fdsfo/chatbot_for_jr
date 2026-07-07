// RAG.md §11: "Recommended: 300–800 words. Overlap: 50–100 words."
const CHUNK_SIZE_WORDS = 500;
const CHUNK_OVERLAP_WORDS = 75;

// No embedding model/API is available in this project (Groq's integration
// here is chat-completion only, no embeddings endpoint — see
// IMPLEMENTATION_STATUS.md's Architecture Decisions for Phase 16). A fixed-
// dimension hashing-trick vector is used instead: deterministic, provider-
// independent (RAG.md §2), and needs no new external dependency.
const EMBEDDING_DIMENSIONS = 256;

// RAG.md §14 Context Ranking factors actually computable from this
// project's real data — Popularity and Business Priority are omitted
// (no data source exists for either, same "honest gap" pattern as
// Analytics' null metrics).
const RANKING_WEIGHTS = {
  VECTOR_SIMILARITY: 0.6,
  KEYWORD_OVERLAP: 0.3,
  FRESHNESS: 0.1,
};

// Candidate pool cap for brute-force cosine-similarity scoring — MongoDB
// Community Edition (this project's self-hosted `mongo:7`, see
// docker-compose.yml) has no native vector index, so similarity is scored
// in application code; this cap keeps that bounded as content grows, same
// rationale as Analytics' capped samples (Phase 15).
const MAX_CANDIDATE_CHUNKS = 500;

// A doc's freshness contribution decays linearly to 0 over this many days
// since its own publishedAt/updatedAt.
const FRESHNESS_HALF_LIFE_DAYS = 90;

module.exports = {
  CHUNK_SIZE_WORDS,
  CHUNK_OVERLAP_WORDS,
  EMBEDDING_DIMENSIONS,
  RANKING_WEIGHTS,
  MAX_CANDIDATE_CHUNKS,
  FRESHNESS_HALF_LIFE_DAYS,
};
