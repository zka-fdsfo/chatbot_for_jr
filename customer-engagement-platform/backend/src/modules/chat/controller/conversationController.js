const conversationService = require('../service/conversationService');
const messageService = require('../service/messageService');
const executiveService = require('../../executive/service/executiveService');
const summaryService = require('../../ai/service/summaryService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const { NotFoundError } = require('../../../shared/errors');
const catchAsync = require('../../../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const { status, visitorId, mine, page, limit } = req.query;
  const assignedExecutiveId = mine ? req.user.id : undefined;
  const { items, total } = await conversationService.list(
    { status, visitorId, assignedExecutiveId },
    { page, limit },
    req.user,
  );

  return sendSuccess(res, {
    message: 'Conversations retrieved.',
    data: { conversations: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const getById = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user);

  return sendSuccess(res, { message: 'Conversation retrieved.', data: { conversation } });
});

const listMessages = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user);
  const { page, limit } = req.query;
  const { items, total } = await messageService.listByConversation(conversation.conversationId, {
    page,
    limit,
  });

  return sendSuccess(res, {
    message: 'Messages retrieved.',
    data: { messages: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const close = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user);
  const closed = await conversationService.close(conversation.conversationId, req.user.id);
  await executiveService.decrementChats(req.user.id);

  return sendSuccess(res, { message: 'Conversation closed.', data: { conversation: closed } });
});

const updateStatus = catchAsync(async (req, res) => {
  const conversation = await conversationService.updateStatus(req.params.id, req.body.status, req.user);

  return sendSuccess(res, { message: 'Conversation status updated.', data: { conversation } });
});

const reassign = catchAsync(async (req, res) => {
  const conversation = await conversationService.reassign(
    req.params.id,
    req.body.assignedExecutiveId,
    req.user,
  );

  return sendSuccess(res, { message: 'Conversation reassigned.', data: { conversation } });
});

const archive = catchAsync(async (req, res) => {
  const conversation = await conversationService.archive(req.params.id, req.user);

  return sendSuccess(res, { message: 'Conversation archived.', data: { conversation } });
});

const restore = catchAsync(async (req, res) => {
  const conversation = await conversationService.restore(req.params.id, req.user);

  return sendSuccess(res, { message: 'Conversation restored.', data: { conversation } });
});

const listAudit = catchAsync(async (req, res) => {
  const audit = await conversationService.listAudit(req.params.id, req.user);

  return sendSuccess(res, { message: 'Conversation audit trail retrieved.', data: { audit } });
});

const generateSummary = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user);
  const summary = await summaryService.generate(conversation.conversationId);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Conversation summary generated.',
    data: { summary },
  });
});

const getSummary = catchAsync(async (req, res) => {
  const conversation = await conversationService.getById(req.params.id, req.user);
  const summary = await summaryService.getLatest(conversation.conversationId);

  if (!summary) {
    throw new NotFoundError('No summary has been generated for this conversation yet.');
  }

  return sendSuccess(res, { message: 'Conversation summary retrieved.', data: { summary } });
});

module.exports = {
  list,
  getById,
  listMessages,
  close,
  updateStatus,
  reassign,
  archive,
  restore,
  listAudit,
  generateSummary,
  getSummary,
};
