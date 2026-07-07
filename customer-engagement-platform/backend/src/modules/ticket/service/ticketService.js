const ticketRepository = require('../repository/ticketRepository');
const ticketNoteRepository = require('../repository/ticketNoteRepository');
const ticketAuditRepository = require('../repository/ticketAuditRepository');
const ticketCounterRepository = require('../repository/ticketCounterRepository');
const conversationService = require('../../chat/service/conversationService');
const messageService = require('../../chat/service/messageService');
const summaryService = require('../../ai/service/summaryService');
const visitorService = require('../../visitor/service/visitorService');
const executiveService = require('../../executive/service/executiveService');
const { ROLES } = require('../../../shared/constants/roles');
const { getIO } = require('../../../socket/ioRegistry');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('../../../socket/constants/socketEvents');
const { TICKET_STATUS, VALID_STATUS_TRANSITIONS, TICKET_AUDIT_ACTIONS } = require('../constants/ticket');
const { NotFoundError, AppError } = require('../../../shared/errors');
const analyticsEventService = require('../../analytics/service/analyticsEventService');
const { EVENT_TYPE } = require('../../analytics/constants/analytics');

function notifyExecutives(payload) {
  const io = getIO();
  if (!io) return;
  io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

class TicketService {
  async create(input, createdByUserId) {
    // Sprint 2 (Conversation Lifecycle Redesign) — a ticket never creates a
    // conversation, only ever references an existing one; catches a
    // stale/typo'd conversationId as a clean 404 instead of a silently
    // dangling reference.
    if (input.conversationId) {
      await conversationService.getByConversationId(input.conversationId);
    }

    const seq = await ticketCounterRepository.getNextSequence();
    const ticketNumber = `TKT-${String(seq).padStart(6, '0')}`;

    const ticket = await ticketRepository.create({
      ...input,
      ticketNumber,
      createdBy: createdByUserId,
    });

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.CREATED, createdByUserId, {
      subject: ticket.subject,
      source: ticket.source,
    });

    notifyExecutives({ type: 'TICKET_CREATED', ticket });

    analyticsEventService.record(EVENT_TYPE.TICKET_CREATED, {
      ticketId: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
    });

    return ticket;
  }

  async getByIdOrThrow(id) {
    const ticket = await ticketRepository.findByIdWithRelations(id);

    if (!ticket || ticket.isDeleted) {
      throw new NotFoundError('Ticket not found');
    }

    return ticket;
  }

  // TICKET_SYSTEM.md §21: Executives may only view tickets assigned to
  // them; Administrators view all. Enforced here (service layer), not
  // just by filtering the list query, so a direct GET /:id can't leak a
  // ticket that isn't the caller's.
  assertAccessible(ticket, user) {
    if (user.role === ROLES.ADMIN) return;

    const isOwner =
      ticket.assignedExecutiveId &&
      String(ticket.assignedExecutiveId._id ?? ticket.assignedExecutiveId) === String(user.id);

    if (!isOwner) {
      throw new AppError('You do not have access to this ticket.', 403);
    }
  }

  async getById(id, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);
    return ticket;
  }

  async search(filters, options, user) {
    const effectiveFilters = { ...filters };

    if (user.role !== ROLES.ADMIN) {
      effectiveFilters.assignedExecutiveId = user.id;
    }

    return ticketRepository.search(effectiveFilters, options);
  }

  async update(id, updates, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);

    Object.assign(ticket, updates);
    await ticket.save();

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.UPDATED, user.id, updates);

    return ticket;
  }

  async updateStatus(id, nextStatus, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);

    const allowedNext = VALID_STATUS_TRANSITIONS[ticket.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(
        `Cannot transition a ${ticket.status} ticket to ${nextStatus}.`,
        400,
      );
    }

    const previousStatus = ticket.status;
    ticket.status = nextStatus;
    await ticket.save();

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.STATUS_CHANGED, user.id, {
      from: previousStatus,
      to: nextStatus,
    });

    const notificationType =
      nextStatus === TICKET_STATUS.CLOSED
        ? 'TICKET_CLOSED'
        : nextStatus === TICKET_STATUS.REOPENED
          ? 'TICKET_REOPENED'
          : 'TICKET_STATUS_CHANGED';

    notifyExecutives({ type: notificationType, ticket, from: previousStatus, to: nextStatus });

    if (nextStatus === TICKET_STATUS.CLOSED) {
      analyticsEventService.record(EVENT_TYPE.TICKET_CLOSED, {
        ticketId: ticket.id,
        assignedExecutiveId: ticket.assignedExecutiveId ? String(ticket.assignedExecutiveId) : null,
        resolutionTimeSeconds: Math.round((Date.now() - ticket.createdAt.getTime()) / 1000),
      });
    } else if (nextStatus === TICKET_STATUS.REOPENED) {
      analyticsEventService.record(EVENT_TYPE.TICKET_REOPENED, { ticketId: ticket.id });
    }

    return ticket;
  }

  async assign(id, assignedExecutiveId, user) {
    // Confirms assignedExecutiveId actually has an Executive profile,
    // turning a bad/stale id into a clean 404 instead of silently storing
    // an ObjectId that resolves to nothing.
    await executiveService.getByUserId(assignedExecutiveId);

    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);

    const wasUnassigned = !ticket.assignedExecutiveId;
    const previousExecutiveId = ticket.assignedExecutiveId;

    ticket.assignedExecutiveId = assignedExecutiveId;

    if ([TICKET_STATUS.OPEN, TICKET_STATUS.REOPENED].includes(ticket.status)) {
      ticket.status = TICKET_STATUS.ASSIGNED;
    }

    await ticket.save();

    const action = wasUnassigned ? TICKET_AUDIT_ACTIONS.ASSIGNED : TICKET_AUDIT_ACTIONS.REASSIGNED;
    await this.recordAudit(ticket.id, action, user.id, {
      from: previousExecutiveId ?? null,
      to: assignedExecutiveId,
    });

    notifyExecutives({
      type: wasUnassigned ? 'TICKET_ASSIGNED' : 'TICKET_REASSIGNED',
      ticket,
      assignedExecutiveId,
    });

    return this.getByIdOrThrow(id);
  }

  async addNote(id, content, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);

    const note = await ticketNoteRepository.create({
      ticketId: ticket.id,
      authorId: user.id,
      content,
    });

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.NOTE_ADDED, user.id, {
      noteId: note.id,
    });

    notifyExecutives({
      type: 'TICKET_NOTE_ADDED',
      ticket,
      assignedExecutiveId: ticket.assignedExecutiveId,
    });

    return ticketNoteRepository.findByIdWithAuthor(note.id);
  }

  async listNotes(id, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);
    return ticketNoteRepository.findByTicketId(ticket.id);
  }

  async listAudit(id, user) {
    const ticket = await this.getByIdOrThrow(id);
    this.assertAccessible(ticket, user);
    return ticketAuditRepository.findByTicketId(ticket.id);
  }

  // Admin-only (enforced at the route level — requireRole(ADMIN)) —
  // TICKET_SYSTEM.md §13.
  async softDelete(id, user) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket || ticket.isDeleted) {
      throw new NotFoundError('Ticket not found');
    }

    ticket.isDeleted = true;
    ticket.deletedAt = new Date();
    await ticket.save();

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.DELETED, user.id, {});

    return ticket;
  }

  async restore(id, user) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket || !ticket.isDeleted) {
      throw new NotFoundError('Deleted ticket not found');
    }

    ticket.isDeleted = false;
    ticket.deletedAt = null;
    await ticket.save();

    await this.recordAudit(ticket.id, TICKET_AUDIT_ACTIONS.RESTORED, user.id, {});

    return ticket;
  }

  // TICKET_SYSTEM.md §15: "Every ticket should reference Original
  // Conversation, AI Summary, Conversation Transcript, Visitor
  // Information. This prevents duplicate information." — computed on
  // demand from the owning modules rather than copied onto the ticket.
  async getContext(id, user) {
    const ticket = await this.getById(id, user);
    const context = { conversation: null, messages: [], summary: null, visitor: null };

    if (ticket.conversationId) {
      context.conversation = await conversationService
        .getByConversationId(ticket.conversationId)
        .catch(() => null);

      if (context.conversation) {
        const { items } = await messageService.listByConversation(ticket.conversationId, { limit: 200 });
        context.messages = items;
        context.summary = await summaryService.getLatest(ticket.conversationId);
      }
    }

    if (ticket.visitorId) {
      context.visitor = await visitorService.getByVisitorId(ticket.visitorId).catch(() => null);
    }

    return context;
  }

  async recordAudit(ticketId, action, performedBy, details) {
    return ticketAuditRepository.create({ ticketId, action, performedBy, details });
  }

  async countOpen() {
    return ticketRepository.countOpen();
  }
}

module.exports = new TicketService();
