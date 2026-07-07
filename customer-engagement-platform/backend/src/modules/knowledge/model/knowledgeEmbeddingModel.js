const mongoose = require('mongoose');

// RAG.md §8-9: "knowledge_embeddings" — one document per chunk. `text` is
// not in the doc's own §9 example, but is stored here anyway: the
// Retriever needs the chunk's own text (not just its vector) to hand back
// to the Context Builder as the actual retrieved knowledge (RAG.md §16:
// minimize prompt size by returning only the matched chunk, not the whole
// parent document).
const knowledgeEmbeddingSchema = new mongoose.Schema(
  {
    knowledgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Knowledge',
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    // Denormalized from the parent Knowledge doc so the Retriever can
    // return a complete result without a follow-up query per match
    // (RAG.md §22: "avoid scanning operational collections").
    title: {
      type: String,
      required: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    chunkId: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

knowledgeEmbeddingSchema.index({ knowledgeId: 1 });
knowledgeEmbeddingSchema.index({ category: 1 });

const KnowledgeEmbedding = mongoose.model(
  'KnowledgeEmbedding',
  knowledgeEmbeddingSchema,
  'knowledge_embeddings',
);

module.exports = KnowledgeEmbedding;
