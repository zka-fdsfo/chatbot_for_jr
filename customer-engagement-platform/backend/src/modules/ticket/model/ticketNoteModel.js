const mongoose = require('mongoose');

// Internal notes only — TICKET_SYSTEM.md §14: "Visitors must never see
// internal notes." There is no visitor-facing ticket read endpoint at all
// in this phase, so that's enforced by construction, not just a flag.
const ticketNoteSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true },
);

ticketNoteSchema.index({ ticketId: 1, createdAt: 1 });

const TicketNote = mongoose.model('TicketNote', ticketNoteSchema, 'ticket_notes');

module.exports = TicketNote;
