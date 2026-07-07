const mongoose = require('mongoose');
const { EXECUTIVE_STATUS, DEFAULT_MAX_CHATS } = require('../constants/executive');

const executiveSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    department: {
      type: String,
      default: null,
    },
    skills: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(EXECUTIVE_STATUS),
      default: EXECUTIVE_STATUS.OFFLINE,
    },
    maxChats: {
      type: Number,
      default: DEFAULT_MAX_CHATS,
    },
    currentChats: {
      type: Number,
      default: 0,
    },
    socketId: {
      type: String,
      default: null,
    },
    lastSeen: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

executiveSchema.index({ status: 1 });
executiveSchema.index({ department: 1 });

const Executive = mongoose.model('Executive', executiveSchema, 'executives');

module.exports = Executive;
