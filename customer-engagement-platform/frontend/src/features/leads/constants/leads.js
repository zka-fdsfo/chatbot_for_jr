export const LEAD_SCORES = ['HOT', 'WARM', 'COLD'];

export const LEAD_STATUSES = [
  'NEW',
  'ASSIGNED',
  'CONTACTED',
  'FOLLOW_UP',
  'QUALIFIED',
  'CONVERTED',
  'LOST',
  'ARCHIVED',
];

export const LEAD_SOURCES = ['AI_CONVERSATION', 'EXECUTIVE', 'ADMINISTRATOR'];

// Mirrors the backend's VALID_STATUS_TRANSITIONS (lead/constants/lead.js)
// so the status control only ever offers a transition the API will accept.
export const VALID_STATUS_TRANSITIONS = {
  NEW: ['ASSIGNED', 'QUALIFIED', 'LOST', 'ARCHIVED'],
  ASSIGNED: ['CONTACTED', 'QUALIFIED', 'LOST', 'ARCHIVED'],
  CONTACTED: ['FOLLOW_UP', 'QUALIFIED', 'CONVERTED', 'LOST', 'ARCHIVED'],
  FOLLOW_UP: ['CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST', 'ARCHIVED'],
  QUALIFIED: ['CONTACTED', 'CONVERTED', 'LOST', 'ARCHIVED'],
  CONVERTED: ['ARCHIVED'],
  LOST: ['ARCHIVED', 'NEW'],
  ARCHIVED: ['NEW'],
};

export const SCORE_COLOR = {
  HOT: 'error',
  WARM: 'warning',
  COLD: 'info',
};

export const STATUS_COLOR = {
  NEW: 'default',
  ASSIGNED: 'info',
  CONTACTED: 'info',
  FOLLOW_UP: 'warning',
  QUALIFIED: 'success',
  CONVERTED: 'success',
  LOST: 'default',
  ARCHIVED: 'default',
};
