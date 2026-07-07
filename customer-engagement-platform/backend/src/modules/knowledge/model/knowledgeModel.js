const mongoose = require('mongoose');
const { KNOWLEDGE_CATEGORIES, KNOWLEDGE_STATUS } = require('../constants/knowledge');

const knowledgeSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: Object.values(KNOWLEDGE_CATEGORIES),
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      default: {},
    },
    keywords: {
      type: [String],
      default: [],
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(KNOWLEDGE_STATUS),
      default: KNOWLEDGE_STATUS.DRAFT,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

knowledgeSchema.index({ category: 1 });
knowledgeSchema.index({ keywords: 1 });

knowledgeSchema.virtual('isPublished').get(function isPublishedGetter() {
  return this.status === KNOWLEDGE_STATUS.PUBLISHED;
});

knowledgeSchema.set('toJSON', { virtuals: true });
knowledgeSchema.set('toObject', { virtuals: true });

const Knowledge = mongoose.model('Knowledge', knowledgeSchema, 'knowledge_base');

module.exports = Knowledge;
