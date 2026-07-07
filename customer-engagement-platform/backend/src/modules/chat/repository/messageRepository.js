const BaseRepository = require('../../../shared/database/baseRepository');
const Message = require('../model/messageModel');

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async findByConversationId(conversationId, options) {
    return this.findAll({ conversationId }, { sort: 'sentAt', ...options });
  }

  async markReadUpTo(conversationId, excludeSenderType, upToDate) {
    return this.model.updateMany(
      {
        conversationId,
        senderType: { $ne: excludeSenderType },
        sentAt: { $lte: upToDate },
        readAt: null,
      },
      { readAt: new Date() },
    );
  }

  // Groups the most recent conversations' messages (sorted) so the caller
  // can compute "time from first visitor message to first executive reply"
  // per conversation — used by the Admin Dashboard's Average Response Time
  // metric. Capped at 200 conversations so this stays cheap as message
  // volume grows.
  async listRecentConversationsMessagesForResponseTime() {
    return this.model.aggregate([
      { $sort: { conversationId: 1, sentAt: 1 } },
      {
        $group: {
          _id: '$conversationId',
          lastSentAt: { $max: '$sentAt' },
          messages: { $push: { senderType: '$senderType', sentAt: '$sentAt' } },
        },
      },
      { $sort: { lastSentAt: -1 } },
      { $limit: 200 },
    ]);
  }

  async countInRange({ senderType, from, to } = {}) {
    const filter = {};
    if (senderType) filter.senderType = senderType;
    if (from || to) {
      filter.sentAt = {};
      if (from) filter.sentAt.$gte = from;
      if (to) filter.sentAt.$lte = to;
    }
    return this.model.countDocuments(filter);
  }
}

module.exports = new MessageRepository();
