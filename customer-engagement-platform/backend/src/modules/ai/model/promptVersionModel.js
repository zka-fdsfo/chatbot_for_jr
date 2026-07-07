const mongoose = require('mongoose');

const promptVersionSchema = new mongoose.Schema(
  {
    promptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Prompt',
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    version: {
      type: Number,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

promptVersionSchema.index({ promptId: 1, version: 1 }, { unique: true });

const PromptVersion = mongoose.model('PromptVersion', promptVersionSchema, 'prompt_versions');

module.exports = PromptVersion;
