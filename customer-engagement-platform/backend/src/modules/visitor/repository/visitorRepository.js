const BaseRepository = require('../../../shared/database/baseRepository');
const Visitor = require('../model/visitorModel');

class VisitorRepository extends BaseRepository {
  constructor() {
    super(Visitor);
  }

  async findByVisitorId(visitorId) {
    return this.model.findOne({ visitorId });
  }

  async countCreatedInRange({ from, to } = {}) {
    const filter = {};
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    return this.model.countDocuments(filter);
  }

  // ANALYTICS.md §11: "Language" — the visitor's own stated preference,
  // the closest real field to a detected browser language (no user-agent
  // -based language detection exists anywhere in this project).
  async groupByPreferredLanguage() {
    return this.model.aggregate([{ $group: { _id: '$preferredLanguage', count: { $sum: 1 } } }]);
  }
}

module.exports = new VisitorRepository();
