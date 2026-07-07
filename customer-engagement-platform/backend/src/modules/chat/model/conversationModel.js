const mongoose = require('mongoose');
const { CONVERSATION_STATUS } = require('../constants/chat');

const conversationSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
      unique: true,
    },
    visitorId: {
      type: String,
      required: true,
    },
    assignedExecutiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUS),
      default: CONVERSATION_STATUS.WAITING,
    },
    channel: {
      type: String,
      default: 'WEB',
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    archivedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

conversationSchema.index({ visitorId: 1 });
conversationSchema.index({ assignedExecutiveId: 1 });
conversationSchema.index({ status: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema, 'conversations');

module.exports = Conversation;
