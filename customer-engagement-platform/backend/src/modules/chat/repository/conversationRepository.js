const BaseRepository = require('../../../shared/database/baseRepository');
const Conversation = require('../model/conversationModel');
const { CONVERSATION_STATUS } = require('../constants/chat');

// RESOLVED counts as "open" — a visitor reconnecting to a RESOLVED
// conversation should resume it (and chatEvents.js reopens it to ACTIVE on
// their next message), not start a brand-new one.
const OPEN_STATUSES = [
  CONVERSATION_STATUS.WAITING,
  CONVERSATION_STATUS.ACTIVE,
  CONVERSATION_STATUS.RESOLVED,
];

class ConversationRepository extends BaseRepository {
  constructor() {
    super(Conversation);
  }

  async findByConversationId(conversationId) {
    return this.model.findOne({ conversationId });
  }

  async findOpenByVisitorId(visitorId) {
    return this.model.findOne({ visitorId, status: { $in: OPEN_STATUSES } }).sort('-createdAt');
  }

  // `scopeToUserId` (a non-admin caller's own user id) restricts results to
  // conversations that are either unclaimed (WAITING — the shared queue
  // every executive can see) or assigned to that caller. Combined with an
  // explicit `status`/`assignedExecutiveId` filter via Mongo's implicit
  // top-level AND, so e.g. `status: CLOSED` + scoping still only returns
  // the caller's own closed conversations, never another executive's.
  async search({ status, visitorId, assignedExecutiveId, scopeToUserId } = {}, options) {
    const filter = {};

    if (status) filter.status = status;
    if (visitorId) filter.visitorId = visitorId;
    if (assignedExecutiveId) filter.assignedExecutiveId = assignedExecutiveId;
    if (scopeToUserId) {
      filter.$or = [{ status: CONVERSATION_STATUS.WAITING }, { assignedExecutiveId: scopeToUserId }];
    }

    return this.findAll(filter, options);
  }

  async countByStatus(status) {
    return this.model.countDocuments({ status });
  }

  async countDistinctVisitorsByStatuses(statuses) {
    const visitorIds = await this.model.distinct('visitorId', { status: { $in: statuses } });
    return visitorIds.length;
  }

  // ANALYTICS.md §6: "Average Conversation Duration" — only conversations
  // that actually ended within the range are counted.
  async getAverageDurationSeconds({ from, to } = {}) {
    const filter = { endedAt: { $ne: null } };
    if (from) filter.endedAt.$gte = from;
    if (to) filter.endedAt.$lte = to;

    const [result] = await this.model.aggregate([
      { $match: filter },
      { $project: { durationSeconds: { $divide: [{ $subtract: ['$endedAt', '$startedAt'] }, 1000] } } },
      { $group: { _id: null, avg: { $avg: '$durationSeconds' } } },
    ]);

    return result ? Math.round(result.avg) : null;
  }
}

module.exports = new ConversationRepository();
