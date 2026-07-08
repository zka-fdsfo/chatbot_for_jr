const conversationService = require('../../modules/chat/service/conversationService');
const messageService = require('../../modules/chat/service/messageService');
const executiveService = require('../../modules/executive/service/executiveService');
const chatReplyService = require('../../modules/ai/service/chatReplyService');
const ticketService = require('../../modules/ticket/service/ticketService');
const { SENDER_TYPE, MESSAGE_TYPE, CONVERSATION_STATUS } = require('../../modules/chat/constants/chat');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('../constants/socketEvents');
const logger = require('../../shared/logger/logger');

const CONNECTING_TO_EXECUTIVE_MESSAGE =
  "Connecting you with a member of our team. They'll join this chat shortly.";
const NO_EXECUTIVE_AVAILABLE_MESSAGE =
  "All of our team members are currently busy. We'll connect you with someone as soon as they're available.";

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}

async function sendSystemMessage(io, conversation, text) {
  const message = await messageService.send({
    conversationId: conversation.conversationId,
    senderType: SENDER_TYPE.SYSTEM,
    senderId: null,
    message: text,
    messageType: MESSAGE_TYPE.SYSTEM,
  });
  io.to(conversationRoom(conversation.conversationId)).emit(SOCKET_EVENTS.CHAT_MESSAGE, message);
  return message;
}

// "Until the AI is able to resolve the query, or the visitor asks for a
// human, an executive can't claim the chat. Notify all employees in the
// dashboard. Once an employee accepts, the chat locks to them." Moves the
// conversation out of AI-only handling into the shared, executive-
// visible ESCALATED state, creates the linked support ticket, and
// broadcasts to every online executive — deliberately unassigned; the
// first one to `chat:join` locks it (see conversationService.
// joinAsExecutive's atomic already-assigned check), not a server-side
// pick. The visitor is told either way, with a different message
// depending on whether anyone is even online to possibly respond.
async function escalateConversation(io, conversation, visitor, triggeringMessage, reason) {
  const escalated = await conversationService.escalate(conversation, reason);

  const ticket = await ticketService.createFromAiEscalation({
    conversation: escalated,
    visitor,
    triggeringMessage: triggeringMessage.message,
  });

  const onlineCount = await executiveService.countOnline();

  io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
    type: 'CONVERSATION_ESCALATED',
    conversation: escalated,
    ticket,
  });

  await sendSystemMessage(
    io,
    escalated,
    onlineCount > 0 ? CONNECTING_TO_EXECUTIVE_MESSAGE : NO_EXECUTIVE_AVAILABLE_MESSAGE,
  );

  return { escalated, ticket };
}

// The AI only ever handles a conversation while it's still WAITING (not
// yet escalated) — once escalated, a human takes over and the AI stops
// replying (ARCHITECTURE.md: "Executives always continue the existing
// conversation"). When the AI can't resolve the visitor's question, or
// the visitor asks for a human, this escalates — see escalateConversation.
async function triggerAiReply(io, conversation, triggeringMessage) {
  const room = conversationRoom(conversation.conversationId);
  io.to(room).emit(SOCKET_EVENTS.CHAT_TYPING, {
    conversationId: conversation.conversationId,
    senderType: SENDER_TYPE.AI,
  });

  try {
    const {
      message: reply,
      usedFallback,
      visitorRequestedHuman,
      visitor,
    } = await chatReplyService.generateReply(conversation, triggeringMessage);
    io.to(room).emit(SOCKET_EVENTS.CHAT_MESSAGE, reply);

    if (usedFallback || visitorRequestedHuman) {
      const reason = visitorRequestedHuman ? 'visitor_requested_human' : 'ai_unresolved';
      await escalateConversation(io, conversation, visitor, triggeringMessage, reason).catch((error) =>
        logger.error(`Escalation failed for conversation ${conversation.conversationId}: ${error.message}`),
      );
    }
  } catch (error) {
    // Only unexpected/programmer errors reach here — chatReplyService
    // already handles a failing/unconfigured AI provider internally by
    // falling back to a graceful message instead of throwing.
    logger.error(`Failed to generate/send AI reply for conversation ${conversation.conversationId}: ${error.message}`);
  } finally {
    io.to(room).emit(SOCKET_EVENTS.CHAT_STOP_TYPING, {
      conversationId: conversation.conversationId,
      senderType: SENDER_TYPE.AI,
    });
  }
}

function resolveSenderType(socket) {
  return socket.data.visitor ? SENDER_TYPE.VISITOR : SENDER_TYPE.EXECUTIVE;
}

function resolveSenderId(socket) {
  return socket.data.visitor ? socket.data.visitor.visitorId : socket.data.user?.id;
}

function registerChatEvents(io, socket) {
  if (socket.data.renewedVisitorToken) {
    socket.emit(SOCKET_EVENTS.VISITOR_TOKEN_RENEWED, {
      visitorToken: socket.data.renewedVisitorToken,
    });
  }

  socket.on(SOCKET_EVENTS.CHAT_JOIN, async ({ conversationId } = {}, ack) => {
    try {
      let conversation;

      if (socket.data.visitor) {
        conversation = conversationId
          ? await conversationService.assertVisitorOwnsConversation(
              conversationId,
              socket.data.visitor.visitorId,
            )
          : await conversationService.getOrCreateActiveForVisitor(socket.data.visitor.visitorId);

        // No executives-room broadcast here anymore — a brand-new
        // conversation is AI-only (WAITING) and not yet actionable by any
        // executive; see escalateConversation for when they actually find
        // out about it.
      } else if (socket.data.user) {
        if (!conversationId) throw new Error('conversationId is required.');

        const { conversation: joined, wasAssigned, justJoined } = await conversationService.joinAsExecutive(
          conversationId,
          socket.data.user.id,
        );
        conversation = joined;

        if (wasAssigned) {
          await executiveService.incrementChats(socket.data.user.id);
          io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.CONVERSATION_ASSIGNED, {
            conversation,
            executiveId: socket.data.user.id,
          });
        }

        // "Once an employee accepts, mention the executive name is
        // connected and available to chat" — fires the moment the claim
        // locks the conversation to them.
        if (justJoined) {
          await sendSystemMessage(
            io,
            conversation,
            `${socket.data.user.name} has joined the chat and is now assisting you.`,
          );
        }
      } else {
        throw new Error('Not authenticated.');
      }

      socket.join(conversationRoom(conversation.conversationId));

      const { items: messages } = await messageService.listByConversation(
        conversation.conversationId,
        { limit: 50 },
      );

      const payload = { conversation, messages };
      socket.emit(SOCKET_EVENTS.CHAT_JOINED, payload);
      if (typeof ack === 'function') ack({ success: true, data: payload });
    } catch (error) {
      logger.warn(`chat:join failed: ${error.message}`);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: error.message });
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.CHAT_MESSAGE, async ({ conversationId, message, messageType } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId is required.');

      let conversation = await conversationService.getByConversationId(conversationId);
      conversationService.assertOpenForMessaging(conversation);

      const saved = await messageService.send({
        conversationId,
        senderType: resolveSenderType(socket),
        senderId: resolveSenderId(socket),
        message,
        messageType,
      });

      io.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.CHAT_MESSAGE, saved);

      if (saved.senderType === SENDER_TYPE.VISITOR) {
        conversation = await conversationService.reopenIfResolved(conversation);

        if (conversation.status === CONVERSATION_STATUS.WAITING) {
          // Still AI-only, not yet escalated — the ordinary case for a
          // new visitor message. Fire-and-forget: the visitor's own
          // message ack must not wait on an LLM round-trip.
          triggerAiReply(io, conversation, saved).catch((error) =>
            logger.error(`Unhandled error triggering AI reply: ${error.message}`),
          );
        } else if (conversation.assignedExecutiveId) {
          // Escalated (or active) and assigned — notify that executive,
          // whether they've actually opened the chat yet or not.
          io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            type: 'VISITOR_REPLY',
            conversationId,
            executiveId: conversation.assignedExecutiveId,
            message: saved,
          });
        }
        // Escalated but not yet assigned (nobody was available): the AI
        // stays silent — it already hasn't been able to help, per this
        // conversation's own history — and there's no executive to
        // notify yet either.
      }

      if (typeof ack === 'function') ack({ success: true, data: saved });
    } catch (error) {
      logger.warn(`chat:message failed: ${error.message}`);
      socket.emit(SOCKET_EVENTS.CHAT_ERROR, { message: error.message });
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });

  socket.on(SOCKET_EVENTS.CHAT_TYPING, ({ conversationId } = {}) => {
    if (!conversationId) return;
    socket
      .to(conversationRoom(conversationId))
      .emit(SOCKET_EVENTS.CHAT_TYPING, { conversationId, senderType: resolveSenderType(socket) });
  });

  socket.on(SOCKET_EVENTS.CHAT_STOP_TYPING, ({ conversationId } = {}) => {
    if (!conversationId) return;
    socket
      .to(conversationRoom(conversationId))
      .emit(SOCKET_EVENTS.CHAT_STOP_TYPING, { conversationId, senderType: resolveSenderType(socket) });
  });

  socket.on(SOCKET_EVENTS.CHAT_READ, async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId is required.');

      const readerSenderType = resolveSenderType(socket);
      await messageService.markRead(conversationId, readerSenderType);

      io.to(conversationRoom(conversationId)).emit(SOCKET_EVENTS.CHAT_READ, {
        conversationId,
        readBy: readerSenderType,
      });
      if (typeof ack === 'function') ack({ success: true });
    } catch (error) {
      logger.warn(`chat:read failed: ${error.message}`);
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });

  // "Add End Chat" — both actors reuse this one event rather than a
  // separate visitor-facing event name: closing a conversation is the
  // same underlying action regardless of who initiates it.
  socket.on(SOCKET_EVENTS.CHAT_CLOSE, async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId is required.');

      let closed;

      if (socket.data.visitor) {
        closed = await conversationService.closeAsVisitor(conversationId, socket.data.visitor.visitorId);
      } else if (socket.data.user) {
        closed = await conversationService.close(conversationId, socket.data.user.id);
        await executiveService.decrementChats(socket.data.user.id);
      } else {
        throw new Error('Not authenticated.');
      }

      // The conversation-room broadcast now happens centrally inside
      // conversationService._applyTransition — covers this socket-
      // triggered path AND the REST PATCH/close endpoints, which
      // previously never notified the visitor's own client at all.
      io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.CONVERSATION_CLOSED, { conversation: closed });

      if (typeof ack === 'function') ack({ success: true, data: closed });
    } catch (error) {
      logger.warn(`chat:close failed: ${error.message}`);
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });

  // "If the employee is busy or wants to transfer the chat, they can
  // click a 'Transfer' button, notifying all active employees again.
  // Whoever accepts locks the chat." Executive-only — unlocks the
  // conversation back to ESCALATED/unassigned and re-broadcasts the same
  // notification a fresh escalation would, so any other executive can
  // claim it exactly like a brand-new handoff.
  socket.on(SOCKET_EVENTS.CHAT_TRANSFER, async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId is required.');
      if (!socket.data.user) throw new Error('Only executives can transfer conversations.');

      const transferred = await conversationService.transfer(conversationId, socket.data.user.id);
      await executiveService.decrementChats(socket.data.user.id);

      io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
        type: 'CONVERSATION_ESCALATED',
        conversation: transferred,
        transferredFrom: socket.data.user.id,
      });

      await sendSystemMessage(
        io,
        transferred,
        "You're being transferred to another team member. Please hold — someone will join shortly.",
      );

      if (typeof ack === 'function') ack({ success: true, data: transferred });
    } catch (error) {
      logger.warn(`chat:transfer failed: ${error.message}`);
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });
}

module.exports = registerChatEvents;
