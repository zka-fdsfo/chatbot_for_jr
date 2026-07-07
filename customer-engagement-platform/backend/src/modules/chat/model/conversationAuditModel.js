const mongoose = require('mongoose');
const { CONVERSATION_AUDIT_ACTIONS } = require('../constants/chat');

// Sprint 2 (Conversation Lifecycle Redesign) — "Preserve executive
// assignment history." Mirrors ticket_audit_logs exactly: immutable,
// create-only, no update/delete path exists anywhere in this module.
const conversationAuditSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(CONVERSATION_AUDIT_ACTIONS),
      required: true,
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

conversationAuditSchema.index({ conversationId: 1, createdAt: 1 });

const ConversationAudit = mongoose.model(
  'ConversationAudit',
  conversationAuditSchema,
  'conversation_audit_logs',
);

module.exports = ConversationAudit;
