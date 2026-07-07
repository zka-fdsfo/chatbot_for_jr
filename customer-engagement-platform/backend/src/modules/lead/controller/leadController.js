const leadService = require('../service/leadService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const detect = catchAsync(async (req, res) => {
  const suggestion = await leadService.detect(req.body.conversationId);

  return sendSuccess(res, { message: 'Lead detection completed.', data: { suggestion } });
});

const create = catchAsync(async (req, res) => {
  const lead = await leadService.create(req.body, req.user.id);

  return sendSuccess(res, { statusCode: 201, message: 'Lead created.', data: { lead } });
});

const search = catchAsync(async (req, res) => {
  const { status, leadScore, assignedExecutiveId, page, limit } = req.query;

  const { items, total } = await leadService.search(
    { status, leadScore, assignedExecutiveId },
    { page, limit },
    req.user,
  );

  return sendSuccess(res, {
    message: 'Leads retrieved.',
    data: { leads: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const getById = catchAsync(async (req, res) => {
  const lead = await leadService.getById(req.params.id, req.user);

  return sendSuccess(res, { message: 'Lead retrieved.', data: { lead } });
});

const update = catchAsync(async (req, res) => {
  const lead = await leadService.update(req.params.id, req.body, req.user);

  return sendSuccess(res, { message: 'Lead updated.', data: { lead } });
});

const updateStatus = catchAsync(async (req, res) => {
  const lead = await leadService.updateStatus(req.params.id, req.body.status, req.user);

  return sendSuccess(res, { message: 'Lead status updated.', data: { lead } });
});

const assign = catchAsync(async (req, res) => {
  const lead = await leadService.assign(req.params.id, req.body.assignedExecutiveId, req.user);

  return sendSuccess(res, { message: 'Lead assigned.', data: { lead } });
});

const generateSummary = catchAsync(async (req, res) => {
  const lead = await leadService.generateSummary(req.params.id, req.user);

  return sendSuccess(res, { statusCode: 201, message: 'Lead summary generated.', data: { lead } });
});

const scheduleFollowUp = catchAsync(async (req, res) => {
  const lead = await leadService.scheduleFollowUp(req.params.id, req.body, req.user);

  return sendSuccess(res, { message: 'Follow-up updated.', data: { lead } });
});

const convert = catchAsync(async (req, res) => {
  const lead = await leadService.convert(req.params.id, req.body, req.user);

  return sendSuccess(res, { message: 'Lead converted.', data: { lead } });
});

const markLost = catchAsync(async (req, res) => {
  const lead = await leadService.markLost(req.params.id, req.body, req.user);

  return sendSuccess(res, { message: 'Lead marked as lost.', data: { lead } });
});

const getContext = catchAsync(async (req, res) => {
  const context = await leadService.getContext(req.params.id, req.user);

  return sendSuccess(res, { message: 'Lead context retrieved.', data: { context } });
});

module.exports = {
  detect,
  create,
  search,
  getById,
  update,
  updateStatus,
  assign,
  generateSummary,
  scheduleFollowUp,
  convert,
  markLost,
  getContext,
};
