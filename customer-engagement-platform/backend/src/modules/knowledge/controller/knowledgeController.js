const knowledgeService = require('../service/knowledgeService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const doc = await knowledgeService.create(req.body);

  return sendSuccess(res, {
    statusCode: 201,
    message: 'Knowledge document created.',
    data: { knowledge: doc },
  });
});

const search = catchAsync(async (req, res) => {
  const { category, status, keyword, page, limit } = req.query;
  const { items, total } = await knowledgeService.search(
    { category, status, keyword },
    { page, limit },
  );

  return sendSuccess(res, {
    message: 'Knowledge documents retrieved.',
    data: { knowledge: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const getById = catchAsync(async (req, res) => {
  const doc = await knowledgeService.getById(req.params.id);

  return sendSuccess(res, { message: 'Knowledge document retrieved.', data: { knowledge: doc } });
});

const getBySlug = catchAsync(async (req, res) => {
  const doc = await knowledgeService.getBySlug(req.params.slug);

  return sendSuccess(res, { message: 'Knowledge document retrieved.', data: { knowledge: doc } });
});

const update = catchAsync(async (req, res) => {
  const doc = await knowledgeService.update(req.params.id, req.body);

  return sendSuccess(res, { message: 'Knowledge document updated.', data: { knowledge: doc } });
});

const publish = catchAsync(async (req, res) => {
  const doc = await knowledgeService.publish(req.params.id);

  return sendSuccess(res, { message: 'Knowledge document published.', data: { knowledge: doc } });
});

const archive = catchAsync(async (req, res) => {
  const doc = await knowledgeService.archive(req.params.id);

  return sendSuccess(res, { message: 'Knowledge document archived.', data: { knowledge: doc } });
});

const listVersions = catchAsync(async (req, res) => {
  const versions = await knowledgeService.listVersions(req.params.id);

  return sendSuccess(res, { message: 'Knowledge versions retrieved.', data: { versions } });
});

const restoreVersion = catchAsync(async (req, res) => {
  const doc = await knowledgeService.restoreVersion(req.params.id, Number(req.params.version));

  return sendSuccess(res, { message: 'Knowledge version restored.', data: { knowledge: doc } });
});

module.exports = {
  create,
  search,
  getById,
  getBySlug,
  update,
  publish,
  archive,
  listVersions,
  restoreVersion,
};
