const analyticsEventRepository = require('../repository/analyticsEventRepository');
const conversationRepository = require('../../chat/repository/conversationRepository');
const messageRepository = require('../../chat/repository/messageRepository');
const messageService = require('../../chat/service/messageService');
const executiveRepository = require('../../executive/repository/executiveRepository');
const ticketRepository = require('../../ticket/repository/ticketRepository');
const leadRepository = require('../../lead/repository/leadRepository');
const visitorRepository = require('../../visitor/repository/visitorRepository');
const visitorSessionRepository = require('../../visitor/repository/visitorSessionRepository');
const businessHoursService = require('../../settings/service/businessHoursService');
const { CONVERSATION_STATUS, SENDER_TYPE } = require('../../chat/constants/chat');
const { EXECUTIVE_STATUS } = require('../../executive/constants/executive');
const { TICKET_STATUS } = require('../../ticket/constants/ticket');
const { LEAD_STATUS } = require('../../lead/constants/lead');
const { BUSINESS_STATUS } = require('../../settings/constants/settings');
const { EVENT_TYPE, DATE_RANGE } = require('../constants/analytics');
const { ROLES } = require('../../../shared/constants/roles');
const { AppError } = require('../../../shared/errors');

// ANALYTICS.md §14: "Support reporting by Today, Yesterday, Last 7 Days,
// Last 30 Days, This Month, Custom Range" — every domain metric endpoint
// (the "Reports" task item) is this same {from, to} shape layered on top
// of a Metrics domain method, rather than a second, separate concept.
function resolveDateRange({ range, from, to } = {}) {
  const now = new Date();

  if (range === DATE_RANGE.CUSTOM) {
    if (!from || !to) {
      throw new AppError('A custom date range requires both "from" and "to".', 400);
    }
    const parsedFrom = new Date(from);
    const parsedTo = new Date(to);
    if (Number.isNaN(parsedFrom.getTime()) || Number.isNaN(parsedTo.getTime())) {
      throw new AppError('"from" and "to" must be valid dates.', 400);
    }
    return { from: parsedFrom, to: parsedTo };
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  switch (range) {
    case DATE_RANGE.YESTERDAY: {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 1);
      const end = new Date(startOfToday.getTime() - 1);
      return { from: start, to: end };
    }
    case DATE_RANGE.LAST_7_DAYS: {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 6);
      return { from: start, to: now };
    }
    case DATE_RANGE.LAST_30_DAYS: {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 29);
      return { from: start, to: now };
    }
    case DATE_RANGE.THIS_MONTH: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start, to: now };
    }
    case DATE_RANGE.TODAY:
    default:
      return { from: startOfToday, to: now };
  }
}

// A small, dependency-free device/browser classifier — same "no new
// library" precedent as Business Hours' Intl-only timezone math. Coarse
// on purpose: ANALYTICS.md §11 only asks for broad Device Type/Browser
// buckets, not precise UA parsing.
function classifyUserAgent(userAgent) {
  if (!userAgent) return { device: 'UNKNOWN', browser: 'UNKNOWN' };

  const ua = userAgent.toLowerCase();
  let device = 'DESKTOP';
  if (/tablet|ipad/.test(ua)) device = 'TABLET';
  else if (/mobi|android|iphone/.test(ua)) device = 'MOBILE';

  let browser = 'OTHER';
  if (/edg\//.test(ua)) browser = 'EDGE';
  else if (/chrome\//.test(ua)) browser = 'CHROME';
  else if (/firefox\//.test(ua)) browser = 'FIREFOX';
  else if (/safari\//.test(ua)) browser = 'SAFARI';

  return { device, browser };
}

function toDistribution(groups) {
  return groups.map((group) => ({ key: group._id ?? 'UNKNOWN', count: group.count }));
}

class AnalyticsService {
  // ANALYTICS.md §5 — live, current-state KPIs. Deliberately sourced the
  // same way as the Phase 11 Admin Dashboard (direct repository queries,
  // not the analytics_events aggregate) — see Architecture Decision for
  // why the two dashboards weren't unified.
  async getDashboardMetrics() {
    const [
      activeVisitors,
      activeConversations,
      waitingConversations,
      onlineExecutives,
      openTickets,
      newLeadsToday,
      averageResponseTimeSeconds,
    ] = await Promise.all([
      conversationRepository.countDistinctVisitorsByStatuses([
        CONVERSATION_STATUS.ACTIVE,
        CONVERSATION_STATUS.WAITING,
      ]),
      conversationRepository.countByStatus(CONVERSATION_STATUS.ACTIVE),
      conversationRepository.countByStatus(CONVERSATION_STATUS.WAITING),
      executiveRepository.count({ status: EXECUTIVE_STATUS.ONLINE }),
      ticketRepository.countOpen(),
      leadRepository.countCreatedSince(resolveDateRange({ range: DATE_RANGE.TODAY }).from),
      messageService.getAverageFirstResponseSeconds(),
    ]);

    return {
      activeVisitors,
      activeConversations,
      waitingConversations,
      onlineExecutives,
      openTickets,
      newLeads: newLeadsToday,
      aiResolutionRate: null,
      averageResponseTimeSeconds,
    };
  }

  async getConversationMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [
      started,
      completed,
      averageDurationSeconds,
      messagesInRange,
      byDay,
      byHour,
    ] = await Promise.all([
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.CONVERSATION_STARTED, range),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.CONVERSATION_CLOSED, range),
      conversationRepository.getAverageDurationSeconds(range),
      messageRepository.countInRange(range),
      analyticsEventRepository.groupByDay(EVENT_TYPE.CONVERSATION_STARTED, range),
      analyticsEventRepository.groupByHour(EVENT_TYPE.CONVERSATION_STARTED, range),
    ]);

    return {
      range,
      conversationsStarted: started,
      conversationsCompleted: completed,
      activeConversations: await conversationRepository.countByStatus(CONVERSATION_STATUS.ACTIVE),
      averageConversationDurationSeconds: averageDurationSeconds,
      averageMessagesPerConversation: started > 0 ? Math.round((messagesInRange / started) * 10) / 10 : null,
      conversationsByDay: byDay.map((entry) => ({ date: entry._id, count: entry.count })),
      conversationsByHour: byHour.map((entry) => ({ hour: entry._id, count: entry.count })),
    };
  }

  // ANALYTICS.md §7 — mostly honest zeros/nulls: no live AI chat-reply
  // pipeline exists yet (known since Phase 8), so there is nothing real to
  // report for aiResolutionRate/aiConfidence/failedResponses/
  // fallbackResponses. aiResponses and humanHandoffs ARE real.
  async getAiMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [aiResponses, humanHandoffs] = await Promise.all([
      messageRepository.countInRange({ senderType: SENDER_TYPE.AI, ...range }),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.CONVERSATION_HANDOFF, range),
    ]);

    return {
      range,
      aiResponses,
      aiResolutionRate: null,
      humanHandoffs,
      aiConfidence: null,
      averageResponseTimeSeconds: await messageService.getAverageFirstResponseSeconds(),
      failedResponses: null,
      fallbackResponses: null,
    };
  }

  // ANALYTICS.md §8 + §18: Executives may only see their own metrics;
  // Administrators may view any executive's (or omit executiveUserId for
  // a merged view across all events in range).
  async getExecutiveMetrics(rangeInput, { executiveUserId, requestingUser }) {
    const range = resolveDateRange(rangeInput);
    const targetId = this.resolveExecutiveScope(executiveUserId, requestingUser);

    const [assignedGroups, resolvedGroups, ticketCount] = await Promise.all([
      analyticsEventRepository.countByTypeGroupedByPayloadField(
        EVENT_TYPE.CONVERSATION_HANDOFF,
        'executiveUserId',
        range,
      ),
      analyticsEventRepository.countByTypeGroupedByPayloadField(
        EVENT_TYPE.CONVERSATION_CLOSED,
        'executiveUserId',
        range,
      ),
      targetId ? ticketRepository.countByAssigneeInRange(targetId, range) : null,
    ]);

    const findCount = (groups, id) => groups.find((group) => group._id === id)?.count ?? 0;

    if (targetId) {
      const resolutionGroups = await analyticsEventRepository.avgPayloadFieldGroupedByPayloadField(
        EVENT_TYPE.CONVERSATION_CLOSED,
        'durationSeconds',
        'executiveUserId',
        range,
      );
      const ownResolution = resolutionGroups.find((group) => group._id === targetId);

      return {
        range,
        executiveUserId: targetId,
        assignedConversations: findCount(assignedGroups, targetId),
        resolvedConversations: findCount(resolvedGroups, targetId),
        averageResponseTimeSeconds: null,
        averageResolutionTimeSeconds: ownResolution ? Math.round(ownResolution.avg) : null,
        activeTime: null,
        ticketCount,
      };
    }

    // Admin, no specific executive requested: a merged view across all.
    return {
      range,
      executiveUserId: null,
      assignedConversations: assignedGroups.reduce((sum, group) => sum + group.count, 0),
      resolvedConversations: resolvedGroups.reduce((sum, group) => sum + group.count, 0),
      averageResponseTimeSeconds: null,
      averageResolutionTimeSeconds: await analyticsEventRepository.avgPayloadField(
        EVENT_TYPE.CONVERSATION_CLOSED,
        'durationSeconds',
        range,
      ),
      activeTime: null,
      ticketCount: null,
    };
  }

  // An Executive-role caller is always forced to their own id, regardless
  // of what (if anything) they asked for — mirrors Tickets'/Leads'
  // assertAccessible pattern rather than trusting a query parameter.
  resolveExecutiveScope(requestedExecutiveUserId, requestingUser) {
    if (requestingUser.role !== ROLES.ADMIN) return String(requestingUser.id);
    return requestedExecutiveUserId ?? null;
  }

  async getLeadMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [total, qualified, converted, lost, sourceGroups, scoreGroups] = await Promise.all([
      leadRepository.countCreatedInRange(range),
      leadRepository.countByStatusInRange(LEAD_STATUS.QUALIFIED, range),
      leadRepository.countByStatusInRange(LEAD_STATUS.CONVERTED, range),
      leadRepository.countByStatusInRange(LEAD_STATUS.LOST, range),
      leadRepository.groupByFieldInRange('source', range),
      leadRepository.groupByFieldInRange('leadScore', range),
    ]);

    return {
      range,
      totalLeads: total,
      qualifiedLeads: qualified,
      convertedLeads: converted,
      lostLeads: lost,
      conversionRate: total > 0 ? Math.round((converted / total) * 1000) / 10 : null,
      leadSources: toDistribution(sourceGroups),
      leadScoreDistribution: toDistribution(scoreGroups),
    };
  }

  async getTicketMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [open, closed, reopened, resolutionTimeSeconds, categoryGroups, priorityGroups] = await Promise.all([
      ticketRepository.countByStatusInRange(TICKET_STATUS.OPEN, range),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.TICKET_CLOSED, range),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.TICKET_REOPENED, range),
      analyticsEventRepository.avgPayloadField(EVENT_TYPE.TICKET_CLOSED, 'resolutionTimeSeconds', range),
      ticketRepository.groupByFieldInRange('category', range),
      ticketRepository.groupByFieldInRange('priority', range),
    ]);

    return {
      range,
      openTickets: open,
      closedTickets: closed,
      resolutionTimeSeconds,
      reopenedTickets: reopened,
      ticketCategories: toDistribution(categoryGroups),
      ticketPriorities: toDistribution(priorityGroups),
    };
  }

  async getVisitorMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [uniqueVisitors, newVisitors, returningVisitors, languageGroups, userAgents] = await Promise.all([
      visitorSessionRepository.countDistinctVisitorsInRange(range),
      visitorRepository.countCreatedInRange(range),
      visitorSessionRepository.countReturningVisitorsInRange(range),
      visitorRepository.groupByPreferredLanguage(),
      visitorSessionRepository.listUserAgentsInRange(range),
    ]);

    const deviceCounts = {};
    const browserCounts = {};
    userAgents.forEach(({ userAgent }) => {
      const { device, browser } = classifyUserAgent(userAgent);
      deviceCounts[device] = (deviceCounts[device] ?? 0) + 1;
      browserCounts[browser] = (browserCounts[browser] ?? 0) + 1;
    });

    return {
      range,
      uniqueVisitors,
      newVisitors,
      returningVisitors,
      deviceType: Object.entries(deviceCounts).map(([key, count]) => ({ key, count })),
      browser: Object.entries(browserCounts).map(([key, count]) => ({ key, count })),
      language: toDistribution(languageGroups),
    };
  }

  async getWidgetMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);

    const [opens, closes, messagesSent, suggestedQuestionUsage, quickReplyUsage] = await Promise.all([
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.WIDGET_OPENED, range),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.WIDGET_CLOSED, range),
      messageRepository.countInRange({ senderType: SENDER_TYPE.VISITOR, ...range }),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.SUGGESTED_QUESTION_USED, range),
      analyticsEventRepository.countByTypeInRange(EVENT_TYPE.QUICK_REPLY_USED, range),
    ]);

    return {
      range,
      widgetOpens: opens,
      widgetCloses: closes,
      messagesSent,
      suggestedQuestionUsage,
      quickReplyUsage,
      // No open/close pairing is tracked (no shared session id is sent
      // with either event), so a real average session duration can't be
      // computed from this data — honestly null rather than approximated.
      averageSessionDurationSeconds: null,
    };
  }

  // ANALYTICS.md §13 — classifies each real CONVERSATION_STARTED/
  // TICKET_CREATED event against the configured Business Hours schedule
  // at the instant it happened, reusing Phase 14's getStatus(atDate).
  async getBusinessHoursMetrics(rangeInput) {
    const range = resolveDateRange(rangeInput);
    const OPEN_STATUSES = new Set([
      BUSINESS_STATUS.OPEN,
      BUSINESS_STATUS.OPENING_SOON,
      BUSINESS_STATUS.CLOSING_SOON,
    ]);

    const [businessHours, conversationTimestamps, ticketTimestamps] = await Promise.all([
      businessHoursService.get(),
      analyticsEventRepository.listTimestampsInRange(EVENT_TYPE.CONVERSATION_STARTED, range),
      analyticsEventRepository.listTimestampsInRange(EVENT_TYPE.TICKET_CREATED, range),
    ]);

    let chatsDuringBusinessHours = 0;
    let chatsOutsideBusinessHours = 0;
    for (const timestamp of conversationTimestamps) {
      const { status } = businessHoursService.computeStatus(businessHours, timestamp);
      if (OPEN_STATUSES.has(status)) chatsDuringBusinessHours += 1;
      else chatsOutsideBusinessHours += 1;
    }

    let ticketsCreatedAfterHours = 0;
    for (const timestamp of ticketTimestamps) {
      const { status } = businessHoursService.computeStatus(businessHours, timestamp);
      if (!OPEN_STATUSES.has(status)) ticketsCreatedAfterHours += 1;
    }

    return {
      range,
      chatsDuringBusinessHours,
      chatsOutsideBusinessHours,
      // No visitor-facing callback-request submission endpoint exists yet
      // (Phase 14, Architecture Decision 82) — always 0, not fabricated.
      callbackRequests: 0,
      ticketsCreatedAfterHours,
    };
  }
}

module.exports = new AnalyticsService();
