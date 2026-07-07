const BaseRepository = require('../../../shared/database/baseRepository');
const ConversationAudit = require('../model/conversationAuditModel');

class ConversationAuditRepository extends BaseRepository {
  constructor() {
    super(ConversationAudit);
  }

  async findByConversationId(conversationId) {
    return this.model.find({ conversationId }).populate('performedBy', 'name email').sort('createdAt');
  }
}

module.exports = new ConversationAuditRepository();
