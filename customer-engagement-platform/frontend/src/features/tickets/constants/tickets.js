export const TICKET_CATEGORIES = [
  'GENERAL',
  'SUPPORT',
  'BOOKING',
  'COMPLAINT',
  'REFUND',
  'TECHNICAL',
  'BILLING',
  'FEEDBACK',
  'OTHER',
];

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TICKET_STATUSES = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
];

export const TICKET_SOURCES = ['AI', 'EXECUTIVE', 'ADMINISTRATOR', 'VISITOR_REQUEST'];

// Mirrors the backend's VALID_STATUS_TRANSITIONS (ticket/constants/ticket.js)
// so the status control only ever offers a transition the API will accept.
export const VALID_STATUS_TRANSITIONS = {
  OPEN: ['ASSIGNED', 'CLOSED'],
  ASSIGNED: ['IN_PROGRESS', 'OPEN', 'CLOSED'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['CLOSED', 'REOPENED'],
  CLOSED: ['REOPENED'],
  REOPENED: ['ASSIGNED', 'IN_PROGRESS'],
};

export const PRIORITY_COLOR = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  URGENT: 'error',
};

export const STATUS_COLOR = {
  OPEN: 'default',
  ASSIGNED: 'info',
  IN_PROGRESS: 'info',
  WAITING_CUSTOMER: 'warning',
  RESOLVED: 'success',
  CLOSED: 'default',
  REOPENED: 'warning',
};
