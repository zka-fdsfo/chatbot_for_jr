const mongoose = require('mongoose');
const { LEAD_SOURCE, LEAD_SCORE, LEAD_STATUS } = require('../constants/lead');

const leadSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      default: null,
    },
    conversationId: {
      type: String,
      default: null,
    },
    name: {
      type: String,
      default: null,
      trim: true,
    },
    email: {
      type: String,
      default: null,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
      trim: true,
    },
    company: {
      type: String,
      default: null,
      trim: true,
    },
    interestedServices: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    leadScore: {
      type: String,
      enum: Object.values(LEAD_SCORE),
      default: LEAD_SCORE.COLD,
    },
    status: {
      type: String,
      enum: Object.values(LEAD_STATUS),
      default: LEAD_STATUS.NEW,
    },
    source: {
      type: String,
      enum: Object.values(LEAD_SOURCE),
      required: true,
    },
    assignedExecutiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // AI Qualification Summary (LEAD_MANAGEMENT.md §11) — a single current
    // summary, regenerated on demand; not versioned (no version-history
    // requirement was given for this, unlike Prompt/Knowledge management).
    aiSummary: {
      summary: { type: String, default: null },
      visitorIntent: { type: String, default: null },
      interestedServices: { type: [String], default: [] },
      recommendedFollowUp: { type: String, default: null },
      confidenceLevel: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW'], default: null },
      generatedAt: { type: Date, default: null },
    },
    // Follow-up (LEAD_MANAGEMENT.md §14) — a single scheduled follow-up at
    // a time; the assigned executive is the lead's own assignedExecutiveId,
    // not duplicated here.
    followUp: {
      scheduledAt: { type: Date, default: null },
      notes: { type: String, default: null },
      outcome: { type: String, default: null },
    },
    convertedAt: {
      type: Date,
      default: null,
    },
    convertedToTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      default: null,
    },
    lostAt: {
      type: Date,
      default: null,
    },
    lostReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

leadSchema.index({ status: 1 });
leadSchema.index({ leadScore: 1 });
leadSchema.index({ assignedExecutiveId: 1 });
leadSchema.index({ visitorId: 1 });
leadSchema.index({ createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema, 'leads');

module.exports = Lead;
