const BaseRepository = require('../../../shared/database/baseRepository');
const TicketAudit = require('../model/ticketAuditModel');

class TicketAuditRepository extends BaseRepository {
  constructor() {
    super(TicketAudit);
  }

  async findByTicketId(ticketId) {
    return this.model.find({ ticketId }).populate('performedBy', 'name email').sort('createdAt');
  }
}

module.exports = new TicketAuditRepository();
