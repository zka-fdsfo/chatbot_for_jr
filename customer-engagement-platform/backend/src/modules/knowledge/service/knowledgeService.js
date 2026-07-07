const knowledgeRepository = require('../repository/knowledgeRepository');
const knowledgeVersionRepository = require('../repository/knowledgeVersionRepository');
const knowledgeEmbeddingService = require('./knowledgeEmbeddingService');
const retrieverService = require('./retrieverService');
const { KNOWLEDGE_STATUS } = require('../constants/knowledge');
const { NotFoundError, ValidationError } = require('../../../shared/errors');
const { toKeywordPattern } = require('../../../shared/helpers/tokenize');

const DUPLICATE_KEY_ERROR_CODE = 11000;
const DUPLICATE_SLUG_MESSAGE = 'A knowledge document with this slug already exists.';

function toSafeVersion(doc) {
  return {
    version: doc.version,
    category: doc.category,
    title: doc.title,
    content: doc.content,
    keywords: doc.keywords,
    status: doc.status,
    createdAt: doc.createdAt,
  };
}

class KnowledgeService {
  async create(data) {
    try {
      return await knowledgeRepository.create(data);
    } catch (error) {
      if (error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new ValidationError(DUPLICATE_SLUG_MESSAGE, ['slug must be unique']);
      }
      throw error;
    }
  }

  async getById(id) {
    const doc = await knowledgeRepository.findById(id);

    if (!doc) {
      throw new NotFoundError('Knowledge document not found');
    }

    return doc;
  }

  async getBySlug(slug) {
    const doc = await knowledgeRepository.findBySlug(slug);

    if (!doc) {
      throw new NotFoundError('Knowledge document not found');
    }

    return doc;
  }

  async search(filters, options) {
    return knowledgeRepository.search(filters, options);
  }

  async update(id, updates) {
    const doc = await this.getById(id);

    if (doc.status === KNOWLEDGE_STATUS.PUBLISHED) {
      await this.snapshotVersion(doc);
      doc.version += 1;
    }

    Object.assign(doc, updates);

    try {
      await doc.save();
    } catch (error) {
      if (error.code === DUPLICATE_KEY_ERROR_CODE) {
        throw new ValidationError(DUPLICATE_SLUG_MESSAGE, ['slug must be unique']);
      }
      throw error;
    }

    // RAG.md §7: "regenerated whenever published content changes." A
    // DRAFT/ARCHIVED doc has no embeddings to regenerate — deleteByKnowledgeId
    // inside regenerateInBackground handles that no-op case too.
    if (doc.status === KNOWLEDGE_STATUS.PUBLISHED) {
      knowledgeEmbeddingService.regenerateInBackground(doc);
    }

    return doc;
  }

  async publish(id) {
    const doc = await this.getById(id);
    doc.status = KNOWLEDGE_STATUS.PUBLISHED;
    doc.publishedAt = new Date();
    await doc.save();

    knowledgeEmbeddingService.regenerateInBackground(doc);

    return doc;
  }

  async archive(id) {
    const doc = await this.getById(id);
    doc.status = KNOWLEDGE_STATUS.ARCHIVED;
    await doc.save();

    // RAG.md §25: "Published knowledge is the only source for embeddings" —
    // an archived doc must stop being retrievable.
    knowledgeEmbeddingService.removeInBackground(doc.id);

    return doc;
  }

  async listVersions(id) {
    await this.getById(id);
    const versions = await knowledgeVersionRepository.findByKnowledgeId(id);
    return versions.map(toSafeVersion);
  }

  async restoreVersion(id, targetVersion) {
    const doc = await this.getById(id);
    const snapshot = await knowledgeVersionRepository.findByKnowledgeIdAndVersion(id, targetVersion);

    if (!snapshot) {
      throw new NotFoundError(`Version ${targetVersion} not found for this document`);
    }

    await this.snapshotVersion(doc);

    doc.category = snapshot.category;
    doc.title = snapshot.title;
    doc.content = snapshot.content;
    doc.keywords = snapshot.keywords;
    doc.version += 1;

    await doc.save();

    if (doc.status === KNOWLEDGE_STATUS.PUBLISHED) {
      knowledgeEmbeddingService.regenerateInBackground(doc);
    }

    return doc;
  }

  // Backfills embeddings for every already-PUBLISHED document — new/edited
  // docs auto-embed via the hooks above, but knowledge published before
  // Phase 16 existed needs a one-time catch-up (see
  // backend/scripts/reindexKnowledgeEmbeddings.js).
  async reindexAll() {
    const { items } = await knowledgeRepository.search(
      { status: KNOWLEDGE_STATUS.PUBLISHED },
      { limit: 1000 },
    );

    for (const doc of items) {
      await knowledgeEmbeddingService.regenerateForKnowledge(doc);
    }

    return items.length;
  }

  // RAG.md §25: "The AI Engine never queries MongoDB directly. All
  // retrieval occurs through the Knowledge Service." The AI Engine's
  // Context Builder calls this instead of `search()` — the Retriever
  // (vector + keyword hybrid search, ranked) is used when embeddings
  // exist; falls back to the original category/keyword search (RAG.md
  // §13 Phase 1) when the knowledge base has no embeddings at all yet
  // (e.g. a fresh install, or before a reindex has run).
  async retrieveForQuery(query, { category, limit } = {}) {
    const hasAnyEmbeddings = await retrieverService.hasEmbeddings();

    if (hasAnyEmbeddings) {
      return retrieverService.retrieve(query, { category, limit });
    }

    const { items } = await this.search(
      { category, keyword: toKeywordPattern(query), status: KNOWLEDGE_STATUS.PUBLISHED },
      { limit },
    );

    return items.map((doc) => ({
      category: doc.category,
      title: doc.title,
      content: doc.content,
      keywords: doc.keywords,
    }));
  }

  async snapshotVersion(doc) {
    await knowledgeVersionRepository.create({
      knowledgeId: doc.id,
      version: doc.version,
      category: doc.category,
      title: doc.title,
      content: doc.content,
      keywords: doc.keywords,
      status: doc.status,
    });
  }
}

module.exports = new KnowledgeService();
