const SOCKET_EVENTS = {
  CHAT_JOIN: 'chat:join',
  CHAT_JOINED: 'chat:joined',
  CHAT_MESSAGE: 'chat:message',
  CHAT_TYPING: 'chat:typing',
  CHAT_STOP_TYPING: 'chat:stop-typing',
  CHAT_READ: 'chat:read',
  CHAT_CLOSE: 'chat:close',
  CHAT_TRANSFER: 'chat:transfer',
  CHAT_ERROR: 'chat:error',
  VISITOR_TOKEN_RENEWED: 'visitor:token-renewed',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_CLOSED: 'conversation:closed',
  NOTIFICATION_NEW: 'notification:new',
  EXECUTIVE_STATUS_UPDATED: 'executive:status-updated',
};

const EXECUTIVES_ROOM = 'executives';

module.exports = { SOCKET_EVENTS, EXECUTIVES_ROOM };
