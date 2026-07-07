const BaseRepository = require('../../../shared/database/baseRepository');
const KnowledgeEmbedding = require('../model/knowledgeEmbeddingModel');
const { MAX_CANDIDATE_CHUNKS } = require('../constants/rag');

class KnowledgeEmbeddingRepository extends BaseRepository {
  constructor() {
    super(KnowledgeEmbedding);
  }

  async createMany(chunks) {
    if (chunks.length === 0) return [];
    return this.model.insertMany(chunks);
  }

  async deleteByKnowledgeId(knowledgeId) {
    return this.model.deleteMany({ knowledgeId });
  }

  // Candidate pool for brute-force cosine-similarity scoring (no native
  // vector index — see constants/rag.js). Pre-filtered by category when
  // provided, capped for cost.
  async findCandidates({ category } = {}) {
    const filter = {};
    if (category) filter.category = category;

    return this.model.find(filter).limit(MAX_CANDIDATE_CHUNKS).lean();
  }

  async countAll() {
    return this.model.countDocuments({});
  }
}

module.exports = new KnowledgeEmbeddingRepository();
