const mongoose = require('mongoose');

// A single document (`_id: 'ticket'`) whose `seq` is atomically incremented
// to hand out sequential, human-referenceable ticket numbers (`TKT-000123`)
// — see `ticketRepository.getNextSequence`.
const ticketCounterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const TicketCounter = mongoose.model('TicketCounter', ticketCounterSchema, 'ticket_counters');

module.exports = TicketCounter;
