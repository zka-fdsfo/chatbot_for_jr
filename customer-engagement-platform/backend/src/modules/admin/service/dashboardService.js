const conversationService = require('../../chat/service/conversationService');
const messageService = require('../../chat/service/messageService');
const executiveService = require('../../executive/service/executiveService');
const ticketService = require('../../ticket/service/ticketService');
const leadService = require('../../lead/service/leadService');
const { CONVERSATION_STATUS } = require('../../chat/constants/chat');
const { EXECUTIVE_STATUS } = require('../../executive/constants/executive');

class DashboardService {
  // ADMIN_PANEL.md §6. `aiResolutionRate` is still `null`, not `0` —
  // there's no resolution-tracking concept anywhere (no "the AI resolved
  // this without a handoff" signal is computed or stored); `null` lets
  // the frontend render "N/A" instead of a misleading real-looking
  // number. `openTickets` (Phase 12) and `todaysLeads` (Phase 13) are now
  // wired to real counts.
  async getMetrics() {
    const [
      activeConversations,
      waitingChats,
      activeVisitors,
      onlineExecutivesResult,
      averageResponseTimeSeconds,
      openTickets,
      todaysLeads,
    ] = await Promise.all([
      conversationService.countByStatus(CONVERSATION_STATUS.ACTIVE),
      conversationService.countByStatus(CONVERSATION_STATUS.WAITING),
      conversationService.countActiveVisitors(),
      executiveService.list({ status: EXECUTIVE_STATUS.ONLINE }, { limit: 1 }),
      messageService.getAverageFirstResponseSeconds(),
      ticketService.countOpen(),
      leadService.countCreatedToday(),
    ]);

    return {
      activeVisitors,
      activeConversations,
      waitingChats,
      onlineExecutives: onlineExecutivesResult.total,
      averageResponseTimeSeconds,
      openTickets,
      todaysLeads,
      aiResolutionRate: null,
    };
  }
}

module.exports = new DashboardService();
