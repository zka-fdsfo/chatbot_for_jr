const leadRepository = require('../repository/leadRepository');
const leadAiService = require('../../ai/service/leadAiService');
const conversationService = require('../../chat/service/conversationService');
const messageService = require('../../chat/service/messageService');
const executiveService = require('../../executive/service/executiveService');
const ticketService = require('../../ticket/service/ticketService');
const { ROLES } = require('../../../shared/constants/roles');
const { getIO } = require('../../../socket/ioRegistry');
const { SOCKET_EVENTS, EXECUTIVES_ROOM } = require('../../../socket/constants/socketEvents');
const { LEAD_STATUS, VALID_STATUS_TRANSITIONS } = require('../constants/lead');
const { NotFoundError, AppError } = require('../../../shared/errors');
const analyticsEventService = require('../../analytics/service/analyticsEventService');
const { EVENT_TYPE } = require('../../analytics/constants/analytics');

function notifyExecutives(payload) {
  const io = getIO();
  if (!io) return;
  io.to(EXECUTIVES_ROOM).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

class LeadService {
  // LEAD_MANAGEMENT.md §10 — suggests a lead from a conversation; never
  // persisted here. The executive reviews the suggestion and calls
  // create() themselves if they want to keep it (§22: "Executives remain
  // responsible for final qualification").
  async detect(conversationId) {
    return leadAiService.detectFromConversation(conversationId);
  }

  async create(input, createdByUserId) {
    const lead = await leadRepository.create({ ...input, createdBy: createdByUserId });

    notifyExecutives({ type: 'LEAD_CREATED', lead });

    analyticsEventService.record(EVENT_TYPE.LEAD_CREATED, { leadId: lead.id, source: lead.source });

    return lead;
  }

  async getByIdOrThrow(id) {
    const lead = await leadRepository.findByIdWithRelations(id);

    if (!lead) {
      throw new NotFoundError('Lead not found');
    }

    return lead;
  }

  // LEAD_MANAGEMENT.md §20: Executives may only access assigned leads;
  // Administrators access all.
  assertAccessible(lead, user) {
    if (user.role === ROLES.ADMIN) return;

    const isOwner =
      lead.assignedExecutiveId &&
      String(lead.assignedExecutiveId._id ?? lead.assignedExecutiveId) === String(user.id);

    if (!isOwner) {
      throw new AppError('You do not have access to this lead.', 403);
    }
  }

  async getById(id, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);
    return lead;
  }

  async search(filters, options, user) {
    const effectiveFilters = { ...filters };

    if (user.role !== ROLES.ADMIN) {
      effectiveFilters.assignedExecutiveId = user.id;
    }

    return leadRepository.search(effectiveFilters, options);
  }

  async update(id, updates, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    Object.assign(lead, updates);
    await lead.save();

    notifyExecutives({ type: 'LEAD_UPDATED', lead, assignedExecutiveId: lead.assignedExecutiveId });

    return lead;
  }

  async updateStatus(id, nextStatus, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    const allowedNext = VALID_STATUS_TRANSITIONS[lead.status] ?? [];
    if (!allowedNext.includes(nextStatus)) {
      throw new AppError(`Cannot transition a ${lead.status} lead to ${nextStatus}.`, 400);
    }

    // LEAD_MANAGEMENT.md §13: Archive/Restore are Administrator actions.
    const entersOrLeavesArchive = nextStatus === LEAD_STATUS.ARCHIVED || lead.status === LEAD_STATUS.ARCHIVED;
    if (entersOrLeavesArchive && user.role !== ROLES.ADMIN) {
      throw new AppError('Only an administrator can archive or restore a lead.', 403);
    }

    lead.status = nextStatus;
    await lead.save();

    notifyExecutives({
      type: 'LEAD_UPDATED',
      lead,
      assignedExecutiveId: lead.assignedExecutiveId,
    });

    return lead;
  }

  async assign(id, assignedExecutiveId, user) {
    // Confirms assignedExecutiveId actually has an Executive profile,
    // turning a bad/stale id into a clean 404.
    await executiveService.getByUserId(assignedExecutiveId);

    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    lead.assignedExecutiveId = assignedExecutiveId;

    if (lead.status === LEAD_STATUS.NEW) {
      lead.status = LEAD_STATUS.ASSIGNED;
    }

    await lead.save();

    notifyExecutives({ type: 'LEAD_ASSIGNED', lead, assignedExecutiveId });

    return this.getByIdOrThrow(id);
  }

  // LEAD_MANAGEMENT.md §11 — regenerated on demand, never automatically.
  async generateSummary(id, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    if (!lead.conversationId) {
      throw new AppError('This lead has no linked conversation to summarize.', 400);
    }

    const result = await leadAiService.generateQualificationSummary(lead.conversationId);

    lead.aiSummary = { ...result, generatedAt: new Date() };
    await lead.save();

    return lead;
  }

  async scheduleFollowUp(id, { scheduledAt, notes, outcome }, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    if (scheduledAt !== undefined) lead.followUp.scheduledAt = scheduledAt;
    if (notes !== undefined) lead.followUp.notes = notes;
    if (outcome !== undefined) lead.followUp.outcome = outcome;

    if (lead.status === LEAD_STATUS.CONTACTED) {
      lead.status = LEAD_STATUS.FOLLOW_UP;
    }

    await lead.save();

    notifyExecutives({
      type: 'FOLLOW_UP_SCHEDULED',
      lead,
      assignedExecutiveId: lead.assignedExecutiveId,
    });

    return lead;
  }

  async convert(id, { ticketId }, user) {
    if (ticketId) {
      // Confirms the id actually refers to a real ticket, turning a
      // bad/stale id into a clean 404 instead of storing a dangling ref.
      await ticketService.getByIdOrThrow(ticketId);
    }

    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    const allowedNext = VALID_STATUS_TRANSITIONS[lead.status] ?? [];
    if (!allowedNext.includes(LEAD_STATUS.CONVERTED)) {
      throw new AppError(`Cannot convert a lead from status ${lead.status}.`, 400);
    }

    lead.status = LEAD_STATUS.CONVERTED;
    lead.convertedAt = new Date();
    if (ticketId) lead.convertedToTicketId = ticketId;

    await lead.save();

    notifyExecutives({ type: 'LEAD_CONVERTED', lead, assignedExecutiveId: lead.assignedExecutiveId });

    analyticsEventService.record(EVENT_TYPE.LEAD_CONVERTED, {
      leadId: lead.id,
      assignedExecutiveId: lead.assignedExecutiveId ? String(lead.assignedExecutiveId) : null,
    });

    return lead;
  }

  async markLost(id, { reason }, user) {
    const lead = await this.getByIdOrThrow(id);
    this.assertAccessible(lead, user);

    const allowedNext = VALID_STATUS_TRANSITIONS[lead.status] ?? [];
    if (!allowedNext.includes(LEAD_STATUS.LOST)) {
      throw new AppError(`Cannot mark a lead from status ${lead.status} as lost.`, 400);
    }

    lead.status = LEAD_STATUS.LOST;
    lead.lostAt = new Date();
    lead.lostReason = reason ?? null;

    await lead.save();

    notifyExecutives({ type: 'LEAD_UPDATED', lead, assignedExecutiveId: lead.assignedExecutiveId });

    return lead;
  }

  // LEAD_MANAGEMENT.md §15: "Every lead should reference Conversation ID,
  // AI Summary, Conversation Transcript, Ticket (if created)." Computed
  // on demand rather than duplicated onto the lead.
  async getContext(id, user) {
    const lead = await this.getById(id, user);
    const context = { conversation: null, messages: [], ticket: null };

    if (lead.conversationId) {
      context.conversation = await conversationService.getByConversationId(lead.conversationId).catch(() => null);

      if (context.conversation) {
        const { items } = await messageService.listByConversation(lead.conversationId, { limit: 200 });
        context.messages = items;
      }
    }

    if (lead.convertedToTicketId) {
      context.ticket = await ticketService.getByIdOrThrow(lead.convertedToTicketId).catch(() => null);
    }

    return context;
  }

  async countCreatedToday() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return leadRepository.countCreatedSince(startOfDay);
  }
}

module.exports = new LeadService();
