import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../../../socket/socketClient';
import { SOCKET_EVENTS } from '../../../socket/socketEvents';
import visitorService from '../../../services/visitorService';
import analyticsService from '../../../services/analyticsService';
import { EVENT_TYPE } from '../../../constants/analytics';
import playNotificationSound from '../../../utils/playNotificationSound';
import {
  CONNECTION_STATUS,
  SENDER_TYPE,
  MESSAGE_TYPE,
  VISITOR_TOKEN_STORAGE_KEY,
  TYPING_STOP_TIMEOUT_MS,
  CLOSED_CONVERSATION_STATUSES,
} from '../constants/chatWidget';

const MAX_TOKEN_RECOVERY_ATTEMPTS = 1;

let nextTempId = 1;

// Returns the visitor profile alongside the token (not just the token) so
// the caller can know whether this visitor already has a name/email on
// file — the visitor-identification form only needs to appear once.
async function resolveVisitorSession() {
  const storedToken = localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY);

  if (storedToken) {
    try {
      const restored = await visitorService.getMySession(storedToken);
      return { visitorToken: restored.visitorToken, visitor: restored.visitor };
    } catch {
      // Stored token is invalid/expired — fall through to creating a fresh session.
    }
  }

  const created = await visitorService.createSession();
  return { visitorToken: created.visitorToken, visitor: created.visitor };
}

export default function useChatWidget(settings) {
  const [isOpen, setIsOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [typingSenderType, setTypingSenderType] = useState(null);
  const [isConversationClosed, setIsConversationClosed] = useState(false);
  const [visitorProfile, setVisitorProfile] = useState(null);

  const isInitializedRef = useRef(false);
  const conversationIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);
  const pendingOutboxRef = useRef([]);
  const settingsRef = useRef(settings);
  const hasConnectedOnceRef = useRef(false);
  const tokenRecoveryAttemptsRef = useRef(0);
  const establishConnectionRef = useRef(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const upsertMessage = useCallback((incoming) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          (incoming._id && item._id === incoming._id) ||
          (incoming.tempId && item.tempId === incoming.tempId),
      );

      if (existingIndex === -1) return [...prev, incoming];

      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...incoming };
      return next;
    });
  }, []);

  const emitMessage = useCallback(
    (socket, { tempId, conversationId, text, messageType }) => {
      socket.emit(
        SOCKET_EVENTS.CHAT_MESSAGE,
        { conversationId, message: text, messageType },
        (ack) => {
          if (ack?.success) {
            upsertMessage({ ...ack.data, tempId, pending: false });
          }
        },
      );
    },
    [upsertMessage],
  );

  const flushOutbox = useCallback(
    (socket) => {
      const queued = pendingOutboxRef.current;
      pendingOutboxRef.current = [];
      queued.forEach((item) => emitMessage(socket, item));
    },
    [emitMessage],
  );

  const joinConversation = useCallback(
    (socket) => {
      socket.emit(
        SOCKET_EVENTS.CHAT_JOIN,
        { conversationId: conversationIdRef.current || undefined },
        (ack) => {
          if (!ack?.success) return;

          conversationIdRef.current = ack.data.conversation.conversationId;
          setConversation(ack.data.conversation);
          setIsConversationClosed(CLOSED_CONVERSATION_STATUSES.includes(ack.data.conversation.status));
          setMessages((prev) => {
            const pendingOnly = prev.filter((item) => item.pending);
            return [...ack.data.messages, ...pendingOnly];
          });

          flushOutbox(socket);
        },
      );
    },
    [flushOutbox],
  );

  // Split out from ensureConnected so the connect_error recovery path
  // below can re-establish the connection directly, without
  // ensureConnected's one-shot isInitializedRef guard blocking it.
  const establishConnection = useCallback(async () => {
    const { visitorToken, visitor } = await resolveVisitorSession();
    localStorage.setItem(VISITOR_TOKEN_STORAGE_KEY, visitorToken);
    setVisitorProfile(visitor);

    // The visitor token rotates on every successful auth (Phase 5's sliding
    // expiration), so `auth` must be a callback re-read at connect time, not
    // a static object — otherwise every reconnect resends the token from the
    // very first connection, which the server already rotated away, and
    // reconnection fails silently forever.
    const socket = connectSocket((callback) => {
      callback({ visitorToken: localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY) });
    });

    socket.on('connect', () => {
      tokenRecoveryAttemptsRef.current = 0;
      hasConnectedOnceRef.current = true;
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
      joinConversation(socket);
    });

    socket.on('disconnect', () => {
      // Distinguishes a genuine first connect (CONNECTING) from losing an
      // already-established one (RECONNECTING) — previously both showed
      // the same generic offline message.
      setConnectionStatus(
        hasConnectedOnceRef.current ? CONNECTION_STATUS.RECONNECTING : CONNECTION_STATUS.DISCONNECTED,
      );
    });

    // The handshake was rejected outright (e.g. the visitor session was
    // ended from another tab, or the stored token is stale in a way
    // resolveVisitorSession's own pre-check didn't catch) — rather than
    // let Socket.IO retry the same bad token forever, clear it and start a
    // genuinely fresh session once. Capped at MAX_TOKEN_RECOVERY_ATTEMPTS
    // so a real network outage doesn't spin in a reconnect loop.
    socket.on('connect_error', () => {
      if (tokenRecoveryAttemptsRef.current >= MAX_TOKEN_RECOVERY_ATTEMPTS) return;
      tokenRecoveryAttemptsRef.current += 1;

      setConnectionStatus(CONNECTION_STATUS.SESSION_EXPIRED);
      localStorage.removeItem(VISITOR_TOKEN_STORAGE_KEY);
      disconnectSocket();
      establishConnectionRef.current();
    });

    socket.on(SOCKET_EVENTS.VISITOR_TOKEN_RENEWED, ({ visitorToken: renewed }) => {
      localStorage.setItem(VISITOR_TOKEN_STORAGE_KEY, renewed);
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (message) => {
      // The room broadcast includes the sender, so the visitor's own
      // messages would otherwise be added twice: once optimistically (then
      // confirmed via the emit's ack callback) and again here. Since a
      // conversation only ever has one visitor, any VISITOR-sender message
      // reaching this client is always our own — skip it and let the ack
      // path be the sole source of truth for it.
      if (message.senderType === SENDER_TYPE.VISITOR) return;
      upsertMessage(message);

      if (settingsRef.current?.featureToggles.soundNotificationsEnabled) {
        playNotificationSound();
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_TYPING, ({ senderType } = {}) => {
      setIsRemoteTyping(true);
      setTypingSenderType(senderType ?? null);
    });
    socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, () => {
      setIsRemoteTyping(false);
      setTypingSenderType(null);
    });

    // Previously the widget never listened for this at all, so a visitor
    // had no idea an executive had ended the chat and could keep typing
    // into nothing.
    socket.on(SOCKET_EVENTS.CONVERSATION_CLOSED, ({ conversation: closedConversation }) => {
      if (closedConversation.conversationId !== conversationIdRef.current) return;
      setConversation(closedConversation);
      setIsConversationClosed(true);
    });
  }, [joinConversation, upsertMessage]);

  useEffect(() => {
    establishConnectionRef.current = establishConnection;
  }, [establishConnection]);

  const ensureConnected = useCallback(async () => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;
    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    await establishConnection();
  }, [establishConnection]);

  const open = useCallback(() => {
    setIsOpen(true);
    ensureConnected();
    analyticsService.recordEvent(EVENT_TYPE.WIDGET_OPENED);
  }, [ensureConnected]);

  const close = useCallback(() => {
    setIsOpen(false);
    analyticsService.recordEvent(EVENT_TYPE.WIDGET_CLOSED);
  }, []);

  const sendMessage = useCallback(
    (text, messageType = MESSAGE_TYPE.TEXT) => {
      const trimmed = (text ?? '').trim();
      if (!trimmed || isConversationClosed) return;

      const tempId = `temp-${nextTempId++}`;
      upsertMessage({
        tempId,
        conversationId: conversationIdRef.current,
        senderType: SENDER_TYPE.VISITOR,
        message: trimmed,
        messageType,
        sentAt: new Date().toISOString(),
        pending: true,
      });

      const socket = getSocket();

      if (!socket?.connected || !conversationIdRef.current) {
        pendingOutboxRef.current.push({
          tempId,
          conversationId: conversationIdRef.current,
          text: trimmed,
          messageType,
        });
        return;
      }

      emitMessage(socket, { tempId, conversationId: conversationIdRef.current, text: trimmed, messageType });
    },
    [emitMessage, upsertMessage, isConversationClosed],
  );

  const notifyTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected || !conversationIdRef.current) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, { conversationId: conversationIdRef.current });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING, { conversationId: conversationIdRef.current });
    }, TYPING_STOP_TIMEOUT_MS);
  }, []);

  const markRead = useCallback(() => {
    const socket = getSocket();
    if (!socket?.connected || !conversationIdRef.current) return;
    socket.emit(SOCKET_EVENTS.CHAT_READ, { conversationId: conversationIdRef.current });
  }, []);

  // "Fix visitor information collection."
  const updateProfile = useCallback(async (updates) => {
    const token = localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY);
    if (!token) return;

    const result = await visitorService.updateMyProfile(token, updates);
    setVisitorProfile(result.visitor);
  }, []);

  // "Add End Chat"/"Reset visitor session." Closes the conversation
  // (which fire-and-forget generates its AI summary server-side), ends
  // the visitor session, then resets the widget to a completely clean
  // state so the next open starts genuinely fresh.
  const endChat = useCallback(async () => {
    const socket = getSocket();

    if (socket?.connected && conversationIdRef.current) {
      await new Promise((resolve) => {
        socket.emit(SOCKET_EVENTS.CHAT_CLOSE, { conversationId: conversationIdRef.current }, () => resolve());
      });
    }

    const token = localStorage.getItem(VISITOR_TOKEN_STORAGE_KEY);
    if (token) {
      await visitorService.endMySession(token).catch(() => {
        // Best-effort — the widget resets locally regardless of whether
        // the server-side session-end call succeeds.
      });
    }

    disconnectSocket();
    localStorage.removeItem(VISITOR_TOKEN_STORAGE_KEY);

    isInitializedRef.current = false;
    hasConnectedOnceRef.current = false;
    tokenRecoveryAttemptsRef.current = 0;
    conversationIdRef.current = null;

    setConversation(null);
    setMessages([]);
    setIsConversationClosed(false);
    setVisitorProfile(null);
    setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      disconnectSocket();
    };
  }, []);

  return {
    isOpen,
    open,
    close,
    connectionStatus,
    conversation,
    messages,
    isRemoteTyping,
    typingSenderType,
    sendMessage,
    notifyTyping,
    markRead,
    isConversationClosed,
    visitorProfile,
    updateProfile,
    endChat,
  };
}
