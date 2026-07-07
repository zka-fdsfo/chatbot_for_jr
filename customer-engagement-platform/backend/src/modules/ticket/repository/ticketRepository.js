const BaseRepository = require('../../../shared/database/baseRepository');
const Ticket = require('../model/ticketModel');

class TicketRepository extends BaseRepository {
  constructor() {
    super(Ticket);
  }

  async findByTicketNumber(ticketNumber) {
    return this.model.findOne({ ticketNumber });
  }

  async search(
    { status, priority, category, assignedExecutiveId, visitorId, ticketNumber, from, to, includeDeleted } = {},
    options,
  ) {
    const filter = {};

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedExecutiveId) filter.assignedExecutiveId = assignedExecutiveId;
    if (visitorId) filter.visitorId = visitorId;
    if (ticketNumber) filter.ticketNumber = ticketNumber;
    if (!includeDeleted) filter.isDeleted = false;

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

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

  async findByIdWithRelations(id) {
    return this.model
      .findById(id)
      .populate('assignedExecutiveId', 'name email')
      .populate('createdBy', 'name email');
  }

  async countOpen() {
    return this.model.countDocuments({ isDeleted: false, status: { $ne: 'CLOSED' } });
  }

  async countByStatusInRange(status, { from, to } = {}) {
    const filter = { status, isDeleted: false };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    return this.model.countDocuments(filter);
  }

  async countByAssigneeInRange(assignedExecutiveId, { from, to } = {}) {
    const filter = { assignedExecutiveId, isDeleted: false };
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = from;
      if (to) filter.createdAt.$lte = to;
    }
    return this.model.countDocuments(filter);
  }

  // ANALYTICS.md §10: "Ticket Categories" / "Ticket Priorities" —
  // distributions of the (non-deleted) tickets created within range.
  async groupByFieldInRange(field, { from, to } = {}) {
    const match = { isDeleted: false };
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

module.exports = new TicketRepository();
