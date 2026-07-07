const BaseRepository = require('../../../shared/database/baseRepository');
const ConversationSummary = require('../model/conversationSummaryModel');

class ConversationSummaryRepository extends BaseRepository {
  constructor() {
    super(ConversationSummary);
  }

  async findLatestByConversationId(conversationId) {
    return this.model.findOne({ conversationId }).sort('-generatedAt');
  }
}

module.exports = new ConversationSummaryRepository();
