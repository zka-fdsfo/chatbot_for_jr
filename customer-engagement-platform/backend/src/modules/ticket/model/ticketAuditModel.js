const mongoose = require('mongoose');
const { TICKET_AUDIT_ACTIONS } = require('../constants/ticket');

// TICKET_SYSTEM.md §18: "Audit history must not be editable." Enforced by
// construction — ticketService only ever calls `create` on this collection,
// no update/delete path exists anywhere in the module.
const ticketAuditSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    action: {
      type: String,
      enum: Object.values(TICKET_AUDIT_ACTIONS),
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

ticketAuditSchema.index({ ticketId: 1, createdAt: 1 });

const TicketAudit = mongoose.model('TicketAudit', ticketAuditSchema, 'ticket_audit_logs');

module.exports = TicketAudit;
