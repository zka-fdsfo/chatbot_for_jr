// ANALYTICS.md §21: "Every important action should generate an analytics
// event... Events should be immutable." Only event types with a real,
// wireable trigger somewhere in the codebase are listed here — no
// AI_RESPONSE/AI_HANDOFF/AI_FAILED type exists because nothing in this
// project currently generates a live AI chat reply (see IMPLEMENTATION_
// STATUS.md's Known Issues, tracked since Phase 8).
const EVENT_TYPE = {
  CONVERSATION_STARTED: 'CONVERSATION_STARTED',
  CONVERSATION_CLOSED: 'CONVERSATION_CLOSED',
  CONVERSATION_HANDOFF: 'CONVERSATION_HANDOFF',
  LEAD_CREATED: 'LEAD_CREATED',
  LEAD_CONVERTED: 'LEAD_CONVERTED',
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_CLOSED: 'TICKET_CLOSED',
  TICKET_REOPENED: 'TICKET_REOPENED',
  EXECUTIVE_ONLINE: 'EXECUTIVE_ONLINE',
  EXECUTIVE_OFFLINE: 'EXECUTIVE_OFFLINE',
  WIDGET_OPENED: 'WIDGET_OPENED',
  WIDGET_CLOSED: 'WIDGET_CLOSED',
  SUGGESTED_QUESTION_USED: 'SUGGESTED_QUESTION_USED',
  QUICK_REPLY_USED: 'QUICK_REPLY_USED',
};

// The only event types a visitor's browser is allowed to submit directly via
// the public POST /analytics/events endpoint — everything else is recorded
// server-side as a side effect of an authenticated/internal operation, never
// accepted as raw client input.
const CLIENT_EVENT_TYPES = [
  EVENT_TYPE.WIDGET_OPENED,
  EVENT_TYPE.WIDGET_CLOSED,
  EVENT_TYPE.SUGGESTED_QUESTION_USED,
  EVENT_TYPE.QUICK_REPLY_USED,
];

// ANALYTICS.md §14: "Support reporting by Today, Yesterday, Last 7 Days,
// Last 30 Days, This Month, Custom Range."
const DATE_RANGE = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  CUSTOM: 'CUSTOM',
};

module.exports = { EVENT_TYPE, CLIENT_EVENT_TYPES, DATE_RANGE };
