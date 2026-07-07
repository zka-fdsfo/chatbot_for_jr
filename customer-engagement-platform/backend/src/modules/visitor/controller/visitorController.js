const visitorService = require('../service/visitorService');
const conversationService = require('../../chat/service/conversationService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const createSession = catchAsync(async (req, res) => {
  const { visitor, session, visitorToken } = await visitorService.createSession({
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Visitor session created.',
    data: { visitor, session, visitorToken },
  });
});

const me = catchAsync(async (req, res) => {
  return sendSuccess(res, {
    message: 'Visitor session restored.',
    data: { visitor: req.visitor, session: req.visitorSession, visitorToken: req.visitorToken },
  });
});

const getByVisitorId = catchAsync(async (req, res) => {
  const visitor = await visitorService.getByVisitorId(req.params.visitorId);

  return sendSuccess(res, { message: 'Visitor retrieved.', data: { visitor } });
});

const getConversationHistory = catchAsync(async (req, res) => {
  await visitorService.getByVisitorId(req.params.visitorId);
  const { page, limit } = req.query;
  const { items, total } = await conversationService.list(
    { visitorId: req.params.visitorId },
    { page, limit },
    req.user,
  );

  return sendSuccess(res, {
    message: 'Visitor conversation history retrieved.',
    data: { conversations: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

module.exports = { createSession, me, getByVisitorId, getConversationHistory };
