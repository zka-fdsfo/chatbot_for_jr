const analyticsEventRepository = require('../repository/analyticsEventRepository');
const logger = require('../../../shared/logger/logger');

class AnalyticsEventService {
  // Fire-and-forget by design (ANALYTICS.md §22: "Analytics must not affect
  // application performance"): callers never `await` this, and a failure
  // here is only logged, never thrown — recording an event must never break
  // the business operation that triggered it.
  record(type, payload = {}) {
    analyticsEventRepository.record(type, payload).catch((error) => {
      logger.error(`Failed to record analytics event "${type}": ${error.message}`);
    });
  }
}

module.exports = new AnalyticsEventService();
