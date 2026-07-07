import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../../../socket/socketClient';
import { SOCKET_EVENTS } from '../../../socket/socketEvents';
import { getAccessToken } from '../../../services/apiClient';
import conversationService from '../../../services/conversationService';
import useNotification from '../../../hooks/useNotification';
import { CONVERSATION_STATUS, TYPING_STOP_TIMEOUT_MS } from '../constants/executiveWorkspace';

export default function useExecutiveWorkspace(currentUserId) {
  const [isConnected, setIsConnected] = useState(false);
  const [queue, setQueue] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [liveExecutiveStatus, setLiveExecutiveStatus] = useState(null);

  const { notify } = useNotification();
  const activeConversationIdRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const result = await conversationService.list({ status: CONVERSATION_STATUS.WAITING, limit: 50 });
    setQueue(result.data.conversations);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const socket = connectSocket((callback) => {
      callback({ accessToken: getAccessToken() });
    });

    socket.on('connect', () => {
      if (!isMounted) return;
      setIsConnected(true);
      refreshQueue();
    });

    socket.on('disconnect', () => {
      if (isMounted) setIsConnected(false);
    });

    socket.on(SOCKET_EVENTS.CHAT_JOINED, ({ conversation, messages: history }) => {
      if (!isMounted) return;
      activeConversationIdRef.current = conversation.conversationId;
      setActiveConversation(conversation);
      setMessages(history);
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (message) => {
      if (isMounted && message.conversationId === activeConversationIdRef.current) {
        setMessages((prev) => [...prev, message]);
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_TYPING, ({ conversationId }) => {
      if (isMounted && conversationId === activeConversationIdRef.current) setIsRemoteTyping(true);
    });

    socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, ({ conversationId }) => {
      if (isMounted && conversationId === activeConversationIdRef.current) setIsRemoteTyping(false);
    });

    socket.on(SOCKET_EVENTS.CHAT_READ, ({ conversationId, readBy }) => {
      if (!isMounted || conversationId !== activeConversationIdRef.current) return;
      setMessages((prev) =>
        prev.map((item) =>
          item.senderType !== readBy && !item.readAt
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );
    });

    socket.on(SOCKET_EVENTS.CONVERSATION_ASSIGNED, ({ conversation }) => {
      if (!isMounted) return;
      setQueue((prev) => prev.filter((item) => item.conversationId !== conversation.conversationId));
    });

    socket.on(SOCKET_EVENTS.CONVERSATION_CLOSED, ({ conversation }) => {
      if (!isMounted) return;
      setQueue((prev) => prev.filter((item) => item.conversationId !== conversation.conversationId));
      setActiveConversation((prev) =>
        prev && prev.conversationId === conversation.conversationId
          ? { ...prev, status: conversation.status, endedAt: conversation.endedAt }
          : prev,
      );
    });

    socket.on(SOCKET_EVENTS.EXECUTIVE_STATUS_UPDATED, ({ status }) => {
      if (isMounted) setLiveExecutiveStatus(status);
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION_NEW, (payload) => {
      if (!isMounted) return;

      if (payload.type === 'NEW_CONVERSATION') {
        setQueue((prev) =>
          prev.some((item) => item.conversationId === payload.conversation.conversationId)
            ? prev
            : [payload.conversation, ...prev],
        );
        notify('New visitor conversation waiting.', { severity: 'info' });
        return;
      }

      if (payload.type === 'VISITOR_REPLY') {
        const isMine = String(payload.executiveId) === String(currentUserId);
        const isCurrentlyOpen = payload.conversationId === activeConversationIdRef.current;

        if (isMine && !isCurrentlyOpen) {
          notify('New reply from a visitor.', { severity: 'info' });
        }
        return;
      }

      // Ticket System (Phase 12) notifications — reuse the same
      // notification:new event and executives room rather than a second
      // socket connection scoped to a Tickets page; only live while the
      // Executive Workspace happens to be mounted, same as VISITOR_REPLY.
      const isMineOrUnassigned =
        !payload.assignedExecutiveId || String(payload.assignedExecutiveId) === String(currentUserId);

      if (!isMineOrUnassigned) return;

      const TICKET_MESSAGES = {
        TICKET_CREATED: `New ticket ${payload.ticket?.ticketNumber} created.`,
        TICKET_ASSIGNED: `Ticket ${payload.ticket?.ticketNumber} assigned to you.`,
        TICKET_REASSIGNED: `Ticket ${payload.ticket?.ticketNumber} reassigned to you.`,
        TICKET_STATUS_CHANGED: `Ticket ${payload.ticket?.ticketNumber} status changed to ${payload.to}.`,
        TICKET_CLOSED: `Ticket ${payload.ticket?.ticketNumber} closed.`,
        TICKET_REOPENED: `Ticket ${payload.ticket?.ticketNumber} reopened.`,
        TICKET_NOTE_ADDED: `New note on ticket ${payload.ticket?.ticketNumber}.`,
      };

      if (TICKET_MESSAGES[payload.type]) {
        notify(TICKET_MESSAGES[payload.type], { severity: 'info' });
        return;
      }

      // Lead Management (Phase 13) notifications — same reused
      // notification:new event/room and executive-scoping as tickets.
      const leadName = payload.lead?.name ?? 'A lead';
      const LEAD_MESSAGES = {
        LEAD_CREATED: `New lead created: ${leadName}.`,
        LEAD_ASSIGNED: `Lead assigned to you: ${leadName}.`,
        LEAD_UPDATED: `Lead updated: ${leadName}.`,
        LEAD_CONVERTED: `Lead converted: ${leadName}.`,
        FOLLOW_UP_SCHEDULED: `Follow-up scheduled for ${leadName}.`,
      };

      if (LEAD_MESSAGES[payload.type]) {
        notify(LEAD_MESSAGES[payload.type], { severity: 'info' });
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(typingTimeoutRef.current);
      disconnectSocket();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const joinConversation = useCallback((conversationId) => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.CHAT_JOIN, { conversationId }, (ack) => {
      if (!ack?.success) return;
      activeConversationIdRef.current = ack.data.conversation.conversationId;
      setActiveConversation(ack.data.conversation);
      setMessages(ack.data.messages);
    });
  }, []);

  const sendMessage = useCallback((text) => {
    const trimmed = (text ?? '').trim();
    const socket = getSocket();
    if (!trimmed || !socket || !activeConversationIdRef.current) return;

    socket.emit(SOCKET_EVENTS.CHAT_MESSAGE, {
      conversationId: activeConversationIdRef.current,
      message: trimmed,
    });
  }, []);

  const notifyTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversationIdRef.current) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, { conversationId: activeConversationIdRef.current });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.CHAT_STOP_TYPING, { conversationId: activeConversationIdRef.current });
    }, TYPING_STOP_TIMEOUT_MS);
  }, []);

  const markRead = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversationIdRef.current) return;
    socket.emit(SOCKET_EVENTS.CHAT_READ, { conversationId: activeConversationIdRef.current });
  }, []);

  const closeConversation = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversationIdRef.current) return;

    // State isn't updated here — the CONVERSATION_CLOSED broadcast listener
    // above is the single source of truth for the resulting conversation
    // state, since the closing executive also receives it (they're in the
    // conversation room). Updating state in both places raced: whichever
    // arrived last won, sometimes clobbering the closed status with a null.
    socket.emit(SOCKET_EVENTS.CHAT_CLOSE, { conversationId: activeConversationIdRef.current }, (ack) => {
      if (!ack?.success) {
        notify(ack?.message ?? 'Failed to close the conversation.', { severity: 'error' });
      }
    });
  }, [notify]);

  return {
    isConnected,
    queue,
    activeConversation,
    messages,
    isRemoteTyping,
    liveExecutiveStatus,
    refreshQueue,
    joinConversation,
    sendMessage,
    notifyTyping,
    markRead,
    closeConversation,
  };
}
