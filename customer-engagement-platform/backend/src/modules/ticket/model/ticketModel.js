const mongoose = require('mongoose');
const {
  TICKET_CATEGORIES,
  TICKET_PRIORITY,
  TICKET_STATUS,
  TICKET_SOURCE,
} = require('../constants/ticket');

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    conversationId: {
      type: String,
      default: null,
    },
    visitorId: {
      type: String,
      default: null,
    },
    assignedExecutiveId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: Object.values(TICKET_CATEGORIES),
      default: TICKET_CATEGORIES.GENERAL,
    },
    priority: {
      type: String,
      enum: Object.values(TICKET_PRIORITY),
      default: TICKET_PRIORITY.MEDIUM,
    },
    status: {
      type: String,
      enum: Object.values(TICKET_STATUS),
      default: TICKET_STATUS.OPEN,
    },
    source: {
      type: String,
      enum: Object.values(TICKET_SOURCE),
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ assignedExecutiveId: 1 });
ticketSchema.index({ visitorId: 1 });
ticketSchema.index({ createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema, 'tickets');

module.exports = Ticket;
