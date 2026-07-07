const BaseRepository = require('../../../shared/database/baseRepository');
const Lead = require('../model/leadModel');

class LeadRepository extends BaseRepository {
  constructor() {
    super(Lead);
  }

  async findByIdWithRelations(id) {
    return this.model
      .findById(id)
      .populate('assignedExecutiveId', 'name email')
      .populate('createdBy', 'name email');
  }

  async search({ status, leadScore, assignedExecutiveId } = {}, options) {
    const filter = {};

    if (status) filter.status = status;
    if (leadScore) filter.leadScore = leadScore;
    if (assignedExecutiveId) filter.assignedExecutiveId = assignedExecutiveId;

    const skip = ((options?.page ?? 1) - 1) * (options?.limit ?? 20);
    const sort = options?.sort ?? '-createdAt';
    const limit = options?.limit ?? 20;

    const [items, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('assignedExecutiveId', 'name email')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    return { items, total, page: options?.page ?? 1, limit };
  }

  async countCreatedSince(date) {
    return this.model.countDocuments({ createdAt: { $gte: date } });
  }

  async countByStatusInRange(status, { from, to } = {}) {
    const filter = { status };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    return this.model.countDocuments(filter);
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

  // ANALYTICS.md §9: "Lead Sources" / "Lead Score Distribution" —
  // distributions of the leads created within range, grouped by whichever
  // field is requested.
  async groupByFieldInRange(field, { from, to } = {}) {
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lte = to;
    }
    return this.model.aggregate([
      { $match: match },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    ]);
  }
}

module.exports = new LeadRepository();
