const mongoose = require('mongoose');
const { SENDER_TYPE, MESSAGE_TYPE } = require('../constants/chat');

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    senderType: {
      type: String,
      enum: Object.values(SENDER_TYPE),
      required: true,
    },
    senderId: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
    },
    attachments: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sentAt: {
      type: Date,
      default: Date.now,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1 });
messageSchema.index({ sentAt: 1 });

const Message = mongoose.model('Message', messageSchema, 'messages');

module.exports = Message;
