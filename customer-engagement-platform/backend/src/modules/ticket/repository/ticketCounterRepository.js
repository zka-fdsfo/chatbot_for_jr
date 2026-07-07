const TicketCounter = require('../model/ticketCounterModel');

class TicketCounterRepository {
  async getNextSequence() {
    const counter = await TicketCounter.findOneAndUpdate(
      { _id: 'ticket' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
    );

    return counter.seq;
  }
}

module.exports = new TicketCounterRepository();
