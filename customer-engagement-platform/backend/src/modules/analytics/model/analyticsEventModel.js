const mongoose = require('mongoose');
const { EVENT_TYPE } = require('../constants/analytics');

// ANALYTICS.md §21/§23: "Events should be immutable" / "Historical data
// should remain immutable." Enforced by construction — this module never
// exposes an update or delete path for this collection, only `create`.
const analyticsEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: Object.values(EVENT_TYPE),
    required: true,
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

analyticsEventSchema.index({ type: 1, createdAt: 1 });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema, 'analytics_events');

module.exports = AnalyticsEvent;
