const mongoose = require('mongoose');

const visitorSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
    },
    visitorId: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

visitorSessionSchema.index({ visitorId: 1 });

const VisitorSession = mongoose.model('VisitorSession', visitorSessionSchema, 'visitor_sessions');

module.exports = VisitorSession;
