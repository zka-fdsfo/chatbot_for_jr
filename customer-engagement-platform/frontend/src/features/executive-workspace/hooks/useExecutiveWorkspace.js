import { useCallback, useEffect, useRef, useState } from 'react';
import { connectSocket, disconnectSocket, getSocket } from '../../../socket/socketClient';
import { SOCKET_EVENTS } from '../../../socket/socketEvents';
import { getAccessToken } from '../../../services/apiClient';
import conversationService from '../../../services/conversationService';
import useNotification from '../../../hooks/useNotification';
import playNotificationSound from '../../../utils/playNotificationSound';
import { CONVERSATION_STATUS, TYPING_STOP_TIMEOUT_MS } from '../constants/executiveWorkspace';

// A ticket landing on this executive specifically (manual reassignment)
// is the "please respond" moment — a plain auto-dismissing toast is easy
// to miss if they're not looking at the screen. This one plays a
// distinct (lower-pitched) sound and stays on screen until dismissed.
const ASSIGNMENT_NOTIFICATION_TYPES = new Set(['TICKET_ASSIGNED', 'TICKET_REASSIGNED']);

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
    // ESCALATED, not WAITING — a plain WAITING conversation is still
    // AI-only and not yet handed off; executives should never see it.
    const result = await conversationService.list({ status: CONVERSATION_STATUS.ESCALATED, limit: 50 });
    setQueue(result.data.conversations);
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

  // "If the employee refreshes the page, the system redirects them back
  // to that same chat" — on every fresh connect, check for a conversation
  // already locked to this executive (ACTIVE, assignedExecutiveId: me)
  // and rejoin it automatically instead of leaving them looking at an
  // empty workspace.
  const resumeLockedConversation = useCallback(async () => {
    const result = await conversationService.list({
      mine: true,
      status: CONVERSATION_STATUS.ACTIVE,
      limit: 1,
    });
    const [locked] = result.data.conversations;
    if (locked) joinConversation(locked.conversationId);
  }, [joinConversation]);

  useEffect(() => {
    let isMounted = true;

    const socket = connectSocket((callback) => {
      callback({ accessToken: getAccessToken() });
    });

    socket.on('connect', () => {
      if (!isMounted) return;
      setIsConnected(true);
      refreshQueue();
      resumeLockedConversation();
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

      if (payload.type === 'CONVERSATION_ESCALATED') {
        // Fired on every escalation and every Transfer — "notify all
        // employees in the dashboard." Always unassigned at this point:
        // first to `chat:join` locks it, so every executive needs to see
        // and be able to act on this, not just one pre-picked one.
        const incoming = {
          ...payload.conversation,
          _highlight: payload.transferredFrom ? 'transferred' : 'escalated',
        };
        setQueue((prev) =>
          prev.some((item) => item.conversationId === incoming.conversationId)
            ? prev.map((item) => (item.conversationId === incoming.conversationId ? incoming : item))
            : [incoming, ...prev],
        );
        playNotificationSound({ frequency: 660 });
        notify(
          payload.transferredFrom
            ? 'A conversation was transferred and needs a new executive.'
            : 'A visitor needs a human — accept it from the queue.',
          { severity: 'warning', autoHideDuration: null },
        );
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
        if (ASSIGNMENT_NOTIFICATION_TYPES.has(payload.type)) {
          playNotificationSound({ frequency: 660 });
          notify(TICKET_MESSAGES[payload.type], { severity: 'warning', autoHideDuration: null });
        } else {
          notify(TICKET_MESSAGES[payload.type], { severity: 'info' });
        }
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

  // "Ensure they cannot leave without closing it or transferring it" —
  // the strongest signal a browser lets a page give on tab close/refresh
  // is this native confirmation prompt; the actual "can't truly leave"
  // guarantee comes from resumeLockedConversation() above always routing
  // them straight back to the same chat if they do reload.
  useEffect(() => {
    const isLocked = activeConversation?.status === CONVERSATION_STATUS.ACTIVE;

    const handleBeforeUnload = (event) => {
      if (!isLocked) return;
      event.preventDefault();
      // Chrome requires returnValue to be set for the native prompt to show.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [activeConversation]);

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

  // "If the employee is busy or wants to transfer the chat, they can
  // click a 'Transfer' button." Unlike close, this clears local state
  // immediately on success — the conversation no longer belongs to this
  // executive at all, and the CONVERSATION_ESCALATED broadcast (§ above)
  // is what tells every other executive it's now up for grabs again.
  const transferConversation = useCallback(() => {
    const socket = getSocket();
    if (!socket || !activeConversationIdRef.current) return;

    socket.emit(SOCKET_EVENTS.CHAT_TRANSFER, { conversationId: activeConversationIdRef.current }, (ack) => {
      if (!ack?.success) {
        notify(ack?.message ?? 'Failed to transfer the conversation.', { severity: 'error' });
        return;
      }

      activeConversationIdRef.current = null;
      setActiveConversation(null);
      setMessages([]);
      notify('Conversation transferred — waiting for another executive to accept it.', { severity: 'info' });
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
    transferConversation,
  };
}
