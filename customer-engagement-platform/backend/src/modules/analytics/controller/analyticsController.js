const analyticsService = require('../service/analyticsService');
const analyticsEventService = require('../service/analyticsEventService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const getDashboard = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getDashboardMetrics();
  return sendSuccess(res, { message: 'Dashboard metrics retrieved.', data: { metrics } });
});

const getConversations = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getConversationMetrics(req.query);
  return sendSuccess(res, { message: 'Conversation analytics retrieved.', data: { metrics } });
});

const getAi = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getAiMetrics(req.query);
  return sendSuccess(res, { message: 'AI analytics retrieved.', data: { metrics } });
});

const getExecutives = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getExecutiveMetrics(req.query, {
    executiveUserId: req.query.executiveUserId,
    requestingUser: req.user,
  });
  return sendSuccess(res, { message: 'Executive analytics retrieved.', data: { metrics } });
});

const getLeads = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getLeadMetrics(req.query);
  return sendSuccess(res, { message: 'Lead analytics retrieved.', data: { metrics } });
});

const getTickets = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getTicketMetrics(req.query);
  return sendSuccess(res, { message: 'Ticket analytics retrieved.', data: { metrics } });
});

const getVisitors = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getVisitorMetrics(req.query);
  return sendSuccess(res, { message: 'Visitor analytics retrieved.', data: { metrics } });
});

const getWidget = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getWidgetMetrics(req.query);
  return sendSuccess(res, { message: 'Widget analytics retrieved.', data: { metrics } });
});

const getBusinessHours = catchAsync(async (req, res) => {
  const metrics = await analyticsService.getBusinessHoursMetrics(req.query);
  return sendSuccess(res, { message: 'Business hours analytics retrieved.', data: { metrics } });
});

// Public — the Chat Widget has no login, so its own opens/closes/
// suggested-question/quick-reply usage has to be reachable without a
// token. Restricted to CLIENT_EVENT_TYPES by the validator.
const recordEvent = catchAsync(async (req, res) => {
  analyticsEventService.record(req.body.type, req.body.payload);
  return sendSuccess(res, { statusCode: 202, message: 'Event accepted.', data: null });
});

module.exports = {
  getDashboard,
  getConversations,
  getAi,
  getExecutives,
  getLeads,
  getTickets,
  getVisitors,
  getWidget,
  getBusinessHours,
  recordEvent,
};
