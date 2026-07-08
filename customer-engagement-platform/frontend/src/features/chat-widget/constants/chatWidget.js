export const SENDER_TYPE = {
  VISITOR: 'VISITOR',
  AI: 'AI',
  EXECUTIVE: 'EXECUTIVE',
  SYSTEM: 'SYSTEM',
};

export const MESSAGE_TYPE = {
  TEXT: 'TEXT',
  SYSTEM: 'SYSTEM',
  LINK: 'LINK',
  QUICK_REPLY: 'QUICK_REPLY',
};

export const CONNECTION_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
};

export const CONNECTION_STATUS_MESSAGE = {
  [CONNECTION_STATUS.CONNECTING]: 'Connecting…',
  [CONNECTION_STATUS.RECONNECTING]: "You're offline. Reconnecting…",
  [CONNECTION_STATUS.SESSION_EXPIRED]: 'Session expired — starting a new one…',
  [CONNECTION_STATUS.DISCONNECTED]: "You're offline.",
};

// The widget only needs to know "has this conversation ended," not the
// full backend status enum.
export const CLOSED_CONVERSATION_STATUSES = ['CLOSED', 'ARCHIVED'];

export const CONVERSATION_ENDED_MESSAGE = 'This conversation has ended.';

export const VISITOR_TOKEN_STORAGE_KEY = 'visitorToken';

export const SUGGESTED_QUESTIONS = [
  'What services do you offer?',
  'What are your business hours?',
  'How do I contact support?',
  'I want to speak with someone.',
];

export const QUICK_REPLIES = [
  'Book Appointment',
  'Business Hours',
  'Pricing',
  'Talk to Human',
  'Contact Us',
];

export const DEFAULT_GREETING = "Hello 👋 How can I help you today?";

export const OFFLINE_MESSAGE = "You're offline. Reconnecting…";

export const TYPING_STOP_TIMEOUT_MS = 3000;
