export const SENDER_TYPE = {
  VISITOR: 'VISITOR',
  AI: 'AI',
  EXECUTIVE: 'EXECUTIVE',
  SYSTEM: 'SYSTEM',
};

export const EXECUTIVE_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  BUSY: 'BUSY',
  AWAY: 'AWAY',
  BREAK: 'BREAK',
};

// Mirrors the backend's CONVERSATION_STATUS (chat/constants/chat.js) —
// Sprint 2 removed the dead HANDOFF value and added ARCHIVED.
export const CONVERSATION_STATUS = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
};

export const TYPING_STOP_TIMEOUT_MS = 3000;
