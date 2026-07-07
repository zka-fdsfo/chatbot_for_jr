const mongoose = require('mongoose');
const { PROMPT_TYPES, PROMPT_STATUS } = require('../constants/prompt');

const promptSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: Object.values(PROMPT_TYPES),
      required: true,
      unique: true,
    },
    content: {
      // Not `required` — Mongoose's built-in String required-checker treats
      // '' as absent, but an empty prompt is a legitimate state (LEAD and
      // ESCALATION seed empty until an admin writes one; see promptService).
      type: String,
      default: '',
    },
    version: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: Object.values(PROMPT_STATUS),
      default: PROMPT_STATUS.DRAFT,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

const Prompt = mongoose.model('Prompt', promptSchema, 'prompts');

module.exports = Prompt;
