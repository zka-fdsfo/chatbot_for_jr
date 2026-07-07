const conversationService = require('../../modules/chat/service/conversationService');
const messageService = require('../../modules/chat/service/messageService');
const executiveService = require('../../modules/executive/service/executiveService');
const { SENDER_TYPE } = require('../../modules/chat/constants/chat');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('../constants/socketEvents');
const logger = require('../../shared/logger/logger');

function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
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

        if (!conversationId) {
          // A brand-new (or resumed) visitor conversation — let the queue know.
          io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            type: 'NEW_CONVERSATION',
            conversation,
          });
        }
      } else if (socket.data.user) {
        if (!conversationId) throw new Error('conversationId is required.');

        const { conversation: joined, wasAssigned } = await conversationService.joinAsExecutive(
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

        if (conversation.assignedExecutiveId) {
          io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
            type: 'VISITOR_REPLY',
            conversationId,
            executiveId: conversation.assignedExecutiveId,
            message: saved,
          });
        }
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

  socket.on(SOCKET_EVENTS.CHAT_CLOSE, async ({ conversationId } = {}, ack) => {
    try {
      if (!conversationId) throw new Error('conversationId is required.');
      if (!socket.data.user) throw new Error('Only executives can close conversations.');

      const closed = await conversationService.close(conversationId, socket.data.user.id);
      await executiveService.decrementChats(socket.data.user.id);

      // The conversation-room broadcast now happens centrally inside
      // conversationService.updateStatus (Sprint 2) — covers this
      // socket-triggered path AND the REST PATCH/close endpoints, which
      // previously never notified the visitor's own client at all.
      io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.CONVERSATION_CLOSED, { conversation: closed });

      if (typeof ack === 'function') ack({ success: true, data: closed });
    } catch (error) {
      logger.warn(`chat:close failed: ${error.message}`);
      if (typeof ack === 'function') ack({ success: false, message: error.message });
    }
  });
}

module.exports = registerChatEvents;
