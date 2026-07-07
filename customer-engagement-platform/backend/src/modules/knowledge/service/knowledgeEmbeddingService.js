const knowledgeEmbeddingRepository = require('../repository/knowledgeEmbeddingRepository');
const embeddingService = require('./embeddingService');
const { KNOWLEDGE_STATUS } = require('../constants/knowledge');
const logger = require('../../../shared/logger/logger');

// Vector Store Integration. RAG.md §7/§19: "Every published knowledge
// document generates an embedding... regenerated whenever published
// content changes... Published knowledge is the only source for
// embeddings." A doc that is DRAFT/ARCHIVED has no embeddings at all.
class KnowledgeEmbeddingService {
  async regenerateForKnowledge(doc) {
    await knowledgeEmbeddingRepository.deleteByKnowledgeId(doc.id);

    if (doc.status !== KNOWLEDGE_STATUS.PUBLISHED) return;

    const text = [doc.title, doc.keywords.join(' '), embeddingService.flattenValue(doc.content)]
      .filter(Boolean)
      .join('\n');

    const chunks = embeddingService.chunkText(text);

    const records = chunks.map((chunkText, chunkId) => ({
      knowledgeId: doc.id,
      category: doc.category,
      title: doc.title,
      keywords: doc.keywords,
      chunkId,
      text: chunkText,
      embedding: embeddingService.embed(chunkText),
      version: doc.version,
    }));

    await knowledgeEmbeddingRepository.createMany(records);
  }

  async removeForKnowledge(knowledgeId) {
    await knowledgeEmbeddingRepository.deleteByKnowledgeId(knowledgeId);
  }

  // RAG.md §19-20: "Embedding generation should run asynchronously...
  // Visitors should never wait for embedding generation." No job-
  // queue/scheduler infrastructure exists anywhere in this project (see
  // Known Issues), so this is fire-and-forget instead: never awaited by
  // the caller, and a failure here is only logged, never thrown — the
  // same pattern already established for Analytics' event recording.
  regenerateInBackground(doc) {
    this.regenerateForKnowledge(doc).catch((error) => {
      logger.error(`Failed to regenerate embeddings for knowledge ${doc.id}: ${error.message}`);
    });
  }

  removeInBackground(knowledgeId) {
    this.removeForKnowledge(knowledgeId).catch((error) => {
      logger.error(`Failed to remove embeddings for knowledge ${knowledgeId}: ${error.message}`);
    });
  }
}

module.exports = new KnowledgeEmbeddingService();
