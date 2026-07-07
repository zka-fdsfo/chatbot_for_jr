const crypto = require('crypto');
const conversationRepository = require('../repository/conversationRepository');
const conversationAuditRepository = require('../repository/conversationAuditRepository');
const {
  CONVERSATION_STATUS,
  VALID_STATUS_TRANSITIONS,
  CONVERSATION_AUDIT_ACTIONS,
} = require('../constants/chat');
const { ROLES } = require('../../../shared/constants/roles');
const { NotFoundError, AppError } = require('../../../shared/errors');
const analyticsEventService = require('../../analytics/service/analyticsEventService');
const { EVENT_TYPE } = require('../../analytics/constants/analytics');
const { getIO } = require('../../../socket/ioRegistry');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('../../../socket/constants/socketEvents');

// Same reused notification:new/executives-room mechanism as Tickets and
// Leads, rather than the parallel snake_case event names sketched in
// IMPROVEMENT_STATUS.md's Sprint 2 socket list — see the architecture
// review's note on avoiding two overlapping event vocabularies.
function notifyExecutives(payload) {
  const io = getIO();
  if (!io) return;
  io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

class ConversationService {
  async getOrCreateActiveForVisitor(visitorId) {
    const existing = await conversationRepository.findOpenByVisitorId(visitorId);
    if (existing) return existing;

    const conversation = await conversationRepository.create({
      conversationId: crypto.randomUUID(),
      visitorId,
      status: CONVERSATION_STATUS.WAITING,
    });

    analyticsEventService.record(EVENT_TYPE.CONVERSATION_STARTED, {
      conversationId: conversation.conversationId,
      visitorId,
    });

    return conversation;
  }

  async getByConversationId(conversationId) {
    const conversation = await conversationRepository.findByConversationId(conversationId);

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    return conversation;
  }

  // Sprint 2 (Conversation Lifecycle Redesign) — chat:message previously
  // never checked this at all, so a message could be sent into a CLOSED
  // conversation indefinitely with no rejection.
  assertOpenForMessaging(conversation) {
    if (
      conversation.status === CONVERSATION_STATUS.CLOSED ||
      conversation.status === CONVERSATION_STATUS.ARCHIVED
    ) {
      throw new AppError('This conversation has ended and can no longer receive messages.', 400);
    }
  }

  // A visitor message arriving on a RESOLVED conversation reopens it —
  // mirrors real support-desk behavior, and gives RESOLVED a real exit
  // path back to ACTIVE instead of being a dead end.
  async reopenIfResolved(conversation) {
    if (conversation.status !== CONVERSATION_STATUS.RESOLVED) return conversation;

    conversation.status = CONVERSATION_STATUS.ACTIVE;
    await conversation.save();

    await this.recordAudit(
      conversation.id,
      CONVERSATION_AUDIT_ACTIONS.STATUS_CHANGED,
      conversation.assignedExecutiveId,
      { from: CONVERSATION_STATUS.RESOLVED, to: CONVERSATION_STATUS.ACTIVE, trigger: 'visitor_message' },
    );

    return conversation;
  }

  async assertVisitorOwnsConversation(conversationId, visitorId) {
    const conversation = await this.getByConversationId(conversationId);

    if (conversation.visitorId !== visitorId) {
      throw new AppError('You do not have access to this conversation.', 403);
    }

    return conversation;
  }

  async joinAsExecutive(conversationId, executiveUserId) {
    const conversation = await this.getByConversationId(conversationId);

    if (
      conversation.assignedExecutiveId &&
      String(conversation.assignedExecutiveId) !== String(executiveUserId)
    ) {
      throw new AppError('This conversation is already assigned to another executive.', 403);
    }

    if (!conversation.assignedExecutiveId) {
      conversation.assignedExecutiveId = executiveUserId;
      conversation.status = CONVERSATION_STATUS.ACTIVE;
      await conversation.save();

      await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.ASSIGNED, executiveUserId, {
        to: executiveUserId,
      });

      analyticsEventService.record(EVENT_TYPE.CONVERSATION_HANDOFF, {
        conversationId: conversation.conversationId,
        visitorId: conversation.visitorId,
        executiveUserId: String(executiveUserId),
      });

      return { conversation, wasAssigned: true };
    }

    return { conversation, wasAssigned: false };
  }

  async close(conversationId, executiveUserId) {
    const conversation = await this.getByConversationId(conversationId);

    if (String(conversation.assignedExecutiveId) !== String(executiveUserId)) {
      throw new AppError('You can only close conversations assigned to you.', 403);
    }

    return this.updateStatus(conversation.id, CONVERSATION_STATUS.CLOSED, {
      id: executiveUserId,
      role: ROLES.EXECUTIVE,
    });
  }

  // Sprint 2 (Conversation Lifecycle Redesign) — "Executives may access
  // only assigned conversations," but a conversation nobody has claimed
  // yet (WAITING) is the shared queue every executive can see and act on.
  assertAccessible(conversation, user) {
    if (user.role === ROLES.ADMIN) return;
    if (conversation.status === CONVERSATION_STATUS.WAITING) return;

    const isOwner =
      conversation.assignedExecutiveId &&
      String(conversation.assignedExecutiveId._id ?? conversation.assignedExecutiveId) === String(user.id);

    if (!isOwner) {
      throw new AppError('You do not have access to this conversation.', 403);
    }
  }

  async list(filters, options, user) {
    const effectiveFilters = { ...filters };

    if (user && user.role !== ROLES.ADMIN) {
      effectiveFilters.scopeToUserId = user.id;
    }

    return conversationRepository.search(effectiveFilters, options);
  }

  async getByIdOrThrow(id) {
    const conversation = await conversationRepository.findById(id);

    if (!conversation) {
      throw new NotFoundError('Conversation not found');
    }

    return conversation;
  }

  async getById(id, user) {
    const conversation = await this.getByIdOrThrow(id);
    this.assertAccessible(conversation, user);
    return conversation;
  }

  async updateStatus(id, nextStatus, user) {
    const conversation = await this.getByIdOrThrow(id);
    this.assertAccessible(conversation, user);

    const allowedNext = VALID_STATUS_TRANSITIONS[conversation.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(`Cannot transition a ${conversation.status} conversation to ${nextStatus}.`, 400);
    }

    const previousStatus = conversation.status;
    conversation.status = nextStatus;
    if (nextStatus === CONVERSATION_STATUS.CLOSED) conversation.endedAt = new Date();
    await conversation.save();

    await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.STATUS_CHANGED, user.id, {
      from: previousStatus,
      to: nextStatus,
    });

    notifyExecutives({ type: 'CONVERSATION_STATUS_CHANGED', conversation, from: previousStatus, to: nextStatus });

    if (nextStatus === CONVERSATION_STATUS.CLOSED) {
      // Sprint 2 bug caught during verification: this broadcast previously
      // only fired from the socket-triggered chat:close handler, so a
      // conversation closed via the REST endpoint never told the visitor's
      // own client at all — centralizing it here means every path that
      // reaches CLOSED (socket or REST) notifies the visitor the same way.
      const io = getIO();
      if (io) {
        io.to(`conversation:${conversation.conversationId}`).emit(SOCKET_EVENTS.CONVERSATION_CLOSED, {
          conversation,
        });
      }

      analyticsEventService.record(EVENT_TYPE.CONVERSATION_CLOSED, {
        conversationId: conversation.conversationId,
        visitorId: conversation.visitorId,
        executiveUserId: conversation.assignedExecutiveId ? String(conversation.assignedExecutiveId) : null,
        durationSeconds: Math.round((conversation.endedAt - conversation.startedAt) / 1000),
      });
    }

    return conversation;
  }

  // Admin-only, enforced here rather than as a separate route middleware —
  // same pattern as Lead's ARCHIVED entry/exit (LEAD_MANAGEMENT.md §13).
  async reassign(id, newExecutiveId, user) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError('Only an administrator can reassign a conversation.', 403);
    }

    const conversation = await this.getByIdOrThrow(id);
    const previousExecutiveId = conversation.assignedExecutiveId;
    conversation.assignedExecutiveId = newExecutiveId;
    await conversation.save();

    await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.REASSIGNED, user.id, {
      from: previousExecutiveId ?? null,
      to: newExecutiveId,
    });

    notifyExecutives({ type: 'CONVERSATION_REASSIGNED', conversation, assignedExecutiveId: newExecutiveId });

    return conversation;
  }

  async archive(id, user) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError('Only an administrator can archive a conversation.', 403);
    }

    const conversation = await this.getByIdOrThrow(id);
    const allowedNext = VALID_STATUS_TRANSITIONS[conversation.status] ?? [];
    if (!allowedNext.includes(CONVERSATION_STATUS.ARCHIVED)) {
      throw new AppError(`Cannot archive a ${conversation.status} conversation.`, 400);
    }

    conversation.status = CONVERSATION_STATUS.ARCHIVED;
    conversation.archivedAt = new Date();
    await conversation.save();

    await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.ARCHIVED, user.id, {});

    notifyExecutives({ type: 'CONVERSATION_ARCHIVED', conversation });

    return conversation;
  }

  async restore(id, user) {
    if (user.role !== ROLES.ADMIN) {
      throw new AppError('Only an administrator can restore a conversation.', 403);
    }

    const conversation = await this.getByIdOrThrow(id);
    if (conversation.status !== CONVERSATION_STATUS.ARCHIVED) {
      throw new AppError('Only an archived conversation can be restored.', 400);
    }

    conversation.status = CONVERSATION_STATUS.CLOSED;
    conversation.archivedAt = null;
    await conversation.save();

    await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.RESTORED, user.id, {});

    notifyExecutives({ type: 'CONVERSATION_RESTORED', conversation });

    return conversation;
  }

  async listAudit(id, user) {
    const conversation = await this.getById(id, user);
    return conversationAuditRepository.findByConversationId(conversation.id);
  }

  async recordAudit(conversationId, action, performedBy, details) {
    return conversationAuditRepository.create({ conversationId, action, performedBy, details });
  }

  async countByStatus(status) {
    return conversationRepository.countByStatus(status);
  }

  async countActiveVisitors() {
    return conversationRepository.countDistinctVisitorsByStatuses([
      CONVERSATION_STATUS.ACTIVE,
      CONVERSATION_STATUS.WAITING,
    ]);
  }
}

module.exports = new ConversationService();
