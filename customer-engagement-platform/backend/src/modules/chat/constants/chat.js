// Sprint 2 (Conversation Lifecycle Redesign): removed the previously dead
// HANDOFF value (defined since Phase 8, never once assigned anywhere in the
// codebase). RESOLVED is now a real, wired intermediate state instead of an
// unused one, and ARCHIVED is new.
const CONVERSATION_STATUS = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
};

// A visitor message arriving on a RESOLVED conversation reopens it to
// ACTIVE (see chatEvents.js) — mirrors real support-desk behavior, and
// keeps RESOLVED from being a dead end the way it was before this sprint.
const VALID_STATUS_TRANSITIONS = {
  [CONVERSATION_STATUS.WAITING]: [CONVERSATION_STATUS.ACTIVE],
  [CONVERSATION_STATUS.ACTIVE]: [CONVERSATION_STATUS.RESOLVED, CONVERSATION_STATUS.CLOSED],
  [CONVERSATION_STATUS.RESOLVED]: [CONVERSATION_STATUS.ACTIVE, CONVERSATION_STATUS.CLOSED],
  [CONVERSATION_STATUS.CLOSED]: [CONVERSATION_STATUS.ARCHIVED],
  [CONVERSATION_STATUS.ARCHIVED]: [CONVERSATION_STATUS.CLOSED],
};

const CONVERSATION_AUDIT_ACTIONS = {
  ASSIGNED: 'ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  ARCHIVED: 'ARCHIVED',
  RESTORED: 'RESTORED',
};

const SENDER_TYPE = {
  VISITOR: 'VISITOR',
  AI: 'AI',
  EXECUTIVE: 'EXECUTIVE',
  SYSTEM: 'SYSTEM',
};

const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM',
  LINK: 'LINK',
  QUICK_REPLY: 'QUICK_REPLY',
};

module.exports = {
  CONVERSATION_STATUS,
  VALID_STATUS_TRANSITIONS,
  CONVERSATION_AUDIT_ACTIONS,
  SENDER_TYPE,
  MESSAGE_TYPE,
};
