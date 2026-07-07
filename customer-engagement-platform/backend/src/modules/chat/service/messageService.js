const messageRepository = require('../repository/messageRepository');
const { MESSAGE_TYPE, SENDER_TYPE } = require('../constants/chat');
const { ValidationError } = require('../../../shared/errors');

const MAX_MESSAGE_LENGTH = 4000;

function assertValidMessageText(text) {
  const trimmed = (text ?? '').trim();

  if (trimmed.length === 0) {
    throw new ValidationError('Message text cannot be empty.', ['message is required']);
  }

  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ValidationError('Message text is too long.', [`message must be at most ${MAX_MESSAGE_LENGTH} characters`]);
  }

  return trimmed;
}

class MessageService {
  async send({ conversationId, senderType, senderId, message, messageType = MESSAGE_TYPE.TEXT }) {
    const text = assertValidMessageText(message);

    return messageRepository.create({
      conversationId,
      senderType,
      senderId,
      message: text,
      messageType,
    });
  }

  async listByConversation(conversationId, options) {
    return messageRepository.findByConversationId(conversationId, options);
  }

  async markRead(conversationId, excludeSenderType, upToDate = new Date()) {
    return messageRepository.markReadUpTo(conversationId, excludeSenderType, upToDate);
  }

  // Powers the Admin Dashboard's Average Response Time metric
  // (ADMIN_PANEL.md §6) — average time from a conversation's first visitor
  // message to the first executive reply after it, across recent
  // conversations. Returns null (not 0) when there's no data yet, so the
  // caller can render "N/A" instead of a misleading zero.
  async getAverageFirstResponseSeconds() {
    const groups = await messageRepository.listRecentConversationsMessagesForResponseTime();

    let totalSeconds = 0;
    let sampleCount = 0;

    groups.forEach(({ messages }) => {
      const firstVisitorMessage = messages.find((message) => message.senderType === SENDER_TYPE.VISITOR);
      if (!firstVisitorMessage) return;

      const firstReply = messages.find(
        (message) =>
          message.senderType === SENDER_TYPE.EXECUTIVE &&
          message.sentAt > firstVisitorMessage.sentAt,
      );
      if (!firstReply) return;

      totalSeconds += (new Date(firstReply.sentAt) - new Date(firstVisitorMessage.sentAt)) / 1000;
      sampleCount += 1;
    });

    return sampleCount > 0 ? Math.round(totalSeconds / sampleCount) : null;
  }
}

module.exports = new MessageService();
