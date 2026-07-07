const BaseRepository = require('../../../shared/database/baseRepository');
const VisitorSession = require('../model/visitorSessionModel');

class VisitorSessionRepository extends BaseRepository {
  constructor() {
    super(VisitorSession);
  }

  async findBySessionId(sessionId) {
    return this.model.findOne({ sessionId });
  }

  async touchActivity(sessionId) {
    return this.model.findOneAndUpdate(
      { sessionId },
      { lastActivityAt: new Date() },
      { new: true },
    );
  }

  async countDistinctVisitorsInRange({ from, to } = {}) {
    const filter = {};
    if (from || to) {
      filter.startedAt = {};
      if (from) filter.startedAt.$gte = from;
      if (to) filter.startedAt.$lte = to;
    }
    const visitorIds = await this.model.distinct('visitorId', filter);
    return visitorIds.length;
  }

  // A visitor is "returning" if they already existed (their Visitor
  // document predates the range) but started a new session within it.
  async countReturningVisitorsInRange({ from, to } = {}) {
    const match = {};
    if (from || to) {
      match.startedAt = {};
      if (from) match.startedAt.$gte = from;
      if (to) match.startedAt.$lte = to;
    }

    const [result] = await this.model.aggregate([
      { $match: match },
      { $group: { _id: '$visitorId' } },
      { $lookup: { from: 'visitors', localField: '_id', foreignField: 'visitorId', as: 'visitor' } },
      { $unwind: '$visitor' },
      ...(from ? [{ $match: { 'visitor.createdAt': { $lt: from } } }] : []),
      { $count: 'count' },
    ]);

    return result?.count ?? 0;
  }

  // Capped at 1000 sessions, same performance rationale as
  // messageRepository's response-time sampling — device/browser
  // classification only needs a representative sample, not every row.
  async listUserAgentsInRange({ from, to } = {}, limit = 1000) {
    const filter = {};
    if (from || to) {
      filter.startedAt = {};
      if (from) filter.startedAt.$gte = from;
      if (to) filter.startedAt.$lte = to;
    }
    return this.model.find(filter).select('userAgent').limit(limit).lean();
  }
}

module.exports = new VisitorSessionRepository();
