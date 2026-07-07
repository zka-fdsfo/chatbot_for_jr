const BaseRepository = require('../../../shared/database/baseRepository');
const TicketNote = require('../model/ticketNoteModel');

class TicketNoteRepository extends BaseRepository {
  constructor() {
    super(TicketNote);
  }

  async findByTicketId(ticketId) {
    return this.model.find({ ticketId }).populate('authorId', 'name email').sort('createdAt');
  }

  async findByIdWithAuthor(id) {
    return this.model.findById(id).populate('authorId', 'name email');
  }
}

module.exports = new TicketNoteRepository();
