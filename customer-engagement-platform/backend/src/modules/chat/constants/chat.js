// Sprint 2 (Conversation Lifecycle Redesign): removed the previously dead
// HANDOFF value (defined since Phase 8, never once assigned anywhere in the
// codebase). RESOLVED is now a real, wired intermediate state instead of an
// unused one, and ARCHIVED is new.
const CONVERSATION_STATUS = {
  WAITING: 'WAITING',
  ESCALATED: 'ESCALATED',
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  ARCHIVED: 'ARCHIVED',
};

// A visitor message arriving on a RESOLVED conversation reopens it to
// ACTIVE (see chatEvents.js) — mirrors real support-desk behavior, and
// keeps RESOLVED from being a dead end the way it was before this sprint.
//
// ESCALATED is new: a conversation is AI-only (WAITING) until the AI
// can't resolve the query or the visitor explicitly asks for a human, at
// which point it moves to ESCALATED — this is the only status an
// executive may ever join/claim; WAITING conversations are not visible
// to executives at all (they haven't been handed off yet).
const VALID_STATUS_TRANSITIONS = {
  // WAITING -> CLOSED: a visitor ending an AI-only, never-claimed chat is
  // the ordinary case (Chat Widget "End Chat") — most conversations never
  // reach an executive at all.
  [CONVERSATION_STATUS.WAITING]: [CONVERSATION_STATUS.ESCALATED, CONVERSATION_STATUS.CLOSED],
  [CONVERSATION_STATUS.ESCALATED]: [CONVERSATION_STATUS.ACTIVE, CONVERSATION_STATUS.CLOSED],
  // ACTIVE -> ESCALATED: "Transfer" — the assigned executive hands the
  // conversation back to the shared, unclaimed queue for someone else to
  // pick up, same as a fresh escalation.
  [CONVERSATION_STATUS.ACTIVE]: [
    CONVERSATION_STATUS.RESOLVED,
    CONVERSATION_STATUS.CLOSED,
    CONVERSATION_STATUS.ESCALATED,
  ],
  [CONVERSATION_STATUS.RESOLVED]: [CONVERSATION_STATUS.ACTIVE, CONVERSATION_STATUS.CLOSED],
  [CONVERSATION_STATUS.CLOSED]: [CONVERSATION_STATUS.ARCHIVED],
  [CONVERSATION_STATUS.ARCHIVED]: [CONVERSATION_STATUS.CLOSED],
};

const CONVERSATION_AUDIT_ACTIONS = {
  ASSIGNED: 'ASSIGNED',
  REASSIGNED: 'REASSIGNED',
  TRANSFERRED: 'TRANSFERRED',
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
