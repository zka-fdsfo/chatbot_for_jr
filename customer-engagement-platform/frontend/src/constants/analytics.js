// Mirrors the backend's CLIENT_EVENT_TYPES (analytics/constants/analytics.js)
// — the only event types the browser is allowed to submit directly via
// POST /analytics/events.
export const EVENT_TYPE = {
  WIDGET_OPENED: 'WIDGET_OPENED',
  WIDGET_CLOSED: 'WIDGET_CLOSED',
  SUGGESTED_QUESTION_USED: 'SUGGESTED_QUESTION_USED',
  QUICK_REPLY_USED: 'QUICK_REPLY_USED',
};
