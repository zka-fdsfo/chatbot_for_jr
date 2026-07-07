const executiveService = require('../service/executiveService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const getMe = catchAsync(async (req, res) => {
  const executive = await executiveService.getOrCreateForUser(req.user.id);

  return sendSuccess(res, {
    message: 'Executive profile retrieved.',
    data: { executive, user: req.user },
  });
});

const updateMyStatus = catchAsync(async (req, res) => {
  const executive = await executiveService.setStatus(req.user.id, req.body.status);

  return sendSuccess(res, { message: 'Availability updated.', data: { executive } });
});

const list = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;
  const { items, total } = await executiveService.adminList({ status }, { page, limit });

  return sendSuccess(res, {
    message: 'Executives retrieved.',
    data: { executives: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const create = catchAsync(async (req, res) => {
  const executive = await executiveService.createExecutive(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Executive created.',
    data: { executive },
  });
});

const update = catchAsync(async (req, res) => {
  const executive = await executiveService.updateProfile(req.params.id, req.body);

  return sendSuccess(res, { message: 'Executive updated.', data: { executive } });
});

const activate = catchAsync(async (req, res) => {
  const executive = await executiveService.setActive(req.params.id, true);

  return sendSuccess(res, { message: 'Executive activated.', data: { executive } });
});

const deactivate = catchAsync(async (req, res) => {
  const executive = await executiveService.setActive(req.params.id, false);

  return sendSuccess(res, { message: 'Executive deactivated.', data: { executive } });
});

const resetPassword = catchAsync(async (req, res) => {
  const executive = await executiveService.resetPassword(req.params.id, req.body.password);

  return sendSuccess(res, { message: 'Executive password reset.', data: { executive } });
});

module.exports = {
  getMe,
  updateMyStatus,
  list,
  create,
  update,
  activate,
  deactivate,
  resetPassword,
};
