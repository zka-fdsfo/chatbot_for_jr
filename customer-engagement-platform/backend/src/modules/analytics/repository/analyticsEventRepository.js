const BaseRepository = require('../../../shared/database/baseRepository');
const AnalyticsEvent = require('../model/analyticsEventModel');

function rangeFilter(from, to) {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }
  return filter;
}

class AnalyticsEventRepository extends BaseRepository {
  constructor() {
    super(AnalyticsEvent);
  }

  async record(type, payload = {}) {
    return this.model.create({ type, payload });
  }

  async countByTypeInRange(type, { from, to } = {}) {
    return this.model.countDocuments({ type, ...rangeFilter(from, to) });
  }

  // Counts events of `type` in range, grouped by a top-level `payload` field
  // (e.g. "executiveUserId") — powers per-executive Executive Analytics.
  async countByTypeGroupedByPayloadField(type, field, { from, to } = {}) {
    return this.model.aggregate([
      { $match: { type, ...rangeFilter(from, to) } },
      { $group: { _id: `$payload.${field}`, count: { $sum: 1 } } },
    ]);
  }

  async groupByDay(type, { from, to } = {}) {
    return this.model.aggregate([
      { $match: { type, ...rangeFilter(from, to) } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  async groupByHour(type, { from, to } = {}) {
    return this.model.aggregate([
      { $match: { type, ...rangeFilter(from, to) } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
  }

  // Average of a numeric `payload` field (e.g. "durationSeconds",
  // "resolutionTimeSeconds") across events of `type` in range — returns
  // null rather than NaN/0 when there's no data to average.
  async avgPayloadField(type, field, { from, to } = {}) {
    const [result] = await this.model.aggregate([
      { $match: { type, ...rangeFilter(from, to), [`payload.${field}`]: { $ne: null } } },
      { $group: { _id: null, avg: { $avg: `$payload.${field}` } } },
    ]);
    return result ? Math.round(result.avg) : null;
  }

  // Grouped by a `payload` field, for per-executive scoping.
  async avgPayloadFieldGroupedByPayloadField(type, field, groupField, { from, to } = {}) {
    return this.model.aggregate([
      { $match: { type, ...rangeFilter(from, to), [`payload.${field}`]: { $ne: null } } },
      { $group: { _id: `$payload.${groupField}`, avg: { $avg: `$payload.${field}` } } },
    ]);
  }

  // Raw timestamps for `type` in range, capped for cost — used to classify
  // each event against Business Hours (ANALYTICS.md §13), which can only
  // be evaluated per-instant in JS, not inside the aggregation pipeline.
  async listTimestampsInRange(type, { from, to } = {}, limit = 2000) {
    const docs = await this.model
      .find({ type, ...rangeFilter(from, to) })
      .select('createdAt')
      .limit(limit)
      .lean();
    return docs.map((doc) => doc.createdAt);
  }
}

module.exports = new AnalyticsEventRepository();
