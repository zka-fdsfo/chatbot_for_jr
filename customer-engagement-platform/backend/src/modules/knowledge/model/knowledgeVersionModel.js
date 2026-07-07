const mongoose = require('mongoose');

const knowledgeVersionSchema = new mongoose.Schema(
  {
    knowledgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Knowledge',
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    keywords: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

knowledgeVersionSchema.index({ knowledgeId: 1, version: 1 }, { unique: true });

const KnowledgeVersion = mongoose.model(
  'KnowledgeVersion',
  knowledgeVersionSchema,
  'knowledge_base_versions',
);

module.exports = KnowledgeVersion;
