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
const logger = require('../../../shared/logger/logger');
const summaryService = require('../../ai/service/summaryService');

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

  // "Once an employee accepts, the chat locks to them so no one else can
  // handle it." An executive may only join/claim a conversation the AI
  // has already handed off (ESCALATED, or later) — never a plain WAITING
  // one still being handled by the AI. The first executive to call this
  // on an unassigned ESCALATED conversation locks it atomically — the
  // `assignedExecutiveId` check below rejects everyone else from that
  // point on, whether they raced in via the same broadcast or opened it
  // moments later.
  async joinAsExecutive(conversationId, executiveUserId) {
    const conversation = await this.getByConversationId(conversationId);

    if (conversation.status === CONVERSATION_STATUS.WAITING) {
      throw new AppError('This conversation has not been escalated to a human yet.', 403);
    }

    if (
      conversation.assignedExecutiveId &&
      String(conversation.assignedExecutiveId) !== String(executiveUserId)
    ) {
      throw new AppError('This conversation is already assigned to another executive.', 403);
    }

    const wasUnassigned = !conversation.assignedExecutiveId;
    if (wasUnassigned) {
      conversation.assignedExecutiveId = executiveUserId;
    }

    const justJoined = conversation.status === CONVERSATION_STATUS.ESCALATED;
    if (justJoined) {
      conversation.status = CONVERSATION_STATUS.ACTIVE;
    }

    if (wasUnassigned || justJoined) {
      await conversation.save();
    }

    if (wasUnassigned) {
      await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.ASSIGNED, executiveUserId, {
        to: executiveUserId,
      });

      analyticsEventService.record(EVENT_TYPE.CONVERSATION_HANDOFF, {
        conversationId: conversation.conversationId,
        visitorId: conversation.visitorId,
        executiveUserId: String(executiveUserId),
      });
    }

    return { conversation, wasAssigned: wasUnassigned, justJoined };
  }

  // "If the employee is busy or wants to transfer the chat, they can
  // click a 'Transfer' button, notifying all active employees again."
  // Unlocks the conversation (back to ESCALATED, unassigned) so any
  // other executive can claim it exactly like a fresh escalation —
  // chatEvents.js re-broadcasts the same notification a new escalation
  // would and tells the visitor they're being handed to someone else.
  async transfer(conversationId, executiveUserId) {
    const conversation = await this.getByConversationId(conversationId);

    if (String(conversation.assignedExecutiveId) !== String(executiveUserId)) {
      throw new AppError('You can only transfer conversations assigned to you.', 403);
    }

    const allowedNext = VALID_STATUS_TRANSITIONS[conversation.status] ?? [];
    if (!allowedNext.includes(CONVERSATION_STATUS.ESCALATED)) {
      throw new AppError(`Cannot transfer a ${conversation.status} conversation.`, 400);
    }

    conversation.assignedExecutiveId = null;
    conversation.status = CONVERSATION_STATUS.ESCALATED;
    await conversation.save();

    await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.TRANSFERRED, executiveUserId, {
      from: executiveUserId,
    });

    return conversation;
  }

  // "Until the AI is able to resolve the query, or the visitor asks for a
  // human, an executive can't claim the chat." Moves a conversation out
  // of AI-only handling (WAITING) into the shared, executive-visible
  // state (ESCALATED) — called from chatEvents.js when the AI reply
  // pipeline falls back, or the visitor's message matches
  // humanRequestDetector.
  async escalate(conversation, reason) {
    return this._applyTransition(conversation, CONVERSATION_STATUS.ESCALATED, null, { trigger: reason });
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

  // "Add End Chat" — a visitor has no User account/role, so it can't go
  // through assertAccessible/updateStatus; ownership here is simply "this
  // is your own conversation." Shares the same transition/broadcast logic
  // as the staff path via _applyTransition, so a broadcast bug fixed once
  // there can't reappear here from a second, separately written path.
  async closeAsVisitor(conversationId, visitorId) {
    const conversation = await this.getByConversationId(conversationId);

    if (conversation.visitorId !== visitorId) {
      throw new AppError('You can only end your own conversation.', 403);
    }

    // Attributed to the assigned executive if one exists; a visitor has no
    // User account to record as `performedBy` (a required ref) otherwise —
    // recordAudit is skipped entirely for an unclaimed (WAITING) chat.
    const closed = await this._applyTransition(
      conversation,
      CONVERSATION_STATUS.CLOSED,
      conversation.assignedExecutiveId,
      { trigger: 'visitor_end_chat' },
    );

    // Fire-and-forget — the visitor never waits for it, and it must never
    // fail their End Chat action (it will fail today with no
    // GROQ_API_KEY configured, same graceful-failure pattern as every
    // other AI-consuming feature in this project).
    summaryService.generate(closed.conversationId).catch((error) => {
      logger.warn(`Skipped end-of-chat summary for ${closed.conversationId}: ${error.message}`);
    });

    return closed;
  }

  // "Executives may access only assigned conversations," but a conversation
  // that's been escalated and nobody has claimed yet (ESCALATED, no
  // assignedExecutiveId) is the shared queue every executive can see and
  // act on. A plain WAITING (still AI-only, not escalated) conversation is
  // never visible to a non-admin at all.
  assertAccessible(conversation, user) {
    if (user.role === ROLES.ADMIN) return;
    if (conversation.status === CONVERSATION_STATUS.ESCALATED && !conversation.assignedExecutiveId) return;

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
    return this._applyTransition(conversation, nextStatus, user.id);
  }

  // Shared transition logic — extracted so a visitor-initiated close
  // (closeAsVisitor) can't independently forget the broadcast/analytics
  // side effects a previously-caught bug (REST close silently not
  // notifying the visitor) already had to fix once.
  async _applyTransition(conversation, nextStatus, performedBy, extraDetails = {}) {
    const allowedNext = VALID_STATUS_TRANSITIONS[conversation.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(`Cannot transition a ${conversation.status} conversation to ${nextStatus}.`, 400);
    }

    const previousStatus = conversation.status;
    conversation.status = nextStatus;
    if (nextStatus === CONVERSATION_STATUS.CLOSED) conversation.endedAt = new Date();
    await conversation.save();

    if (performedBy) {
      await this.recordAudit(conversation.id, CONVERSATION_AUDIT_ACTIONS.STATUS_CHANGED, performedBy, {
        from: previousStatus,
        to: nextStatus,
        ...extraDetails,
      });
    }

    notifyExecutives({ type: 'CONVERSATION_STATUS_CHANGED', conversation, from: previousStatus, to: nextStatus });

    if (nextStatus === CONVERSATION_STATUS.CLOSED) {
      // This broadcast previously only fired from the socket-triggered
      // chat:close handler, so a conversation closed via the REST endpoint
      // never told the visitor's own client at all — centralizing it here
      // means every path that reaches CLOSED (socket, REST, or visitor End
      // Chat) notifies the visitor the same way.
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
      CONVERSATION_STATUS.ESCALATED,
      CONVERSATION_STATUS.WAITING,
    ]);
  }
}

module.exports = new ConversationService();
