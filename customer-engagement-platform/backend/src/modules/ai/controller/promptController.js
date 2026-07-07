const promptService = require('../service/promptService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const list = catchAsync(async (req, res) => {
  const prompts = await promptService.listAll();
  return sendSuccess(res, { message: 'Prompts retrieved.', data: { prompts } });
});

const getByType = catchAsync(async (req, res) => {
  const prompt = await promptService.getByType(req.params.type);
  return sendSuccess(res, { message: 'Prompt retrieved.', data: { prompt } });
});

const update = catchAsync(async (req, res) => {
  const prompt = await promptService.update(req.params.type, req.body.content, req.user.id);
  return sendSuccess(res, { message: 'Prompt updated.', data: { prompt } });
});

const publish = catchAsync(async (req, res) => {
  const prompt = await promptService.publish(req.params.type, req.user.id);
  return sendSuccess(res, { message: 'Prompt published.', data: { prompt } });
});

const listVersions = catchAsync(async (req, res) => {
  const versions = await promptService.listVersions(req.params.type);
  return sendSuccess(res, { message: 'Prompt versions retrieved.', data: { versions } });
});

const restoreVersion = catchAsync(async (req, res) => {
  const prompt = await promptService.restoreVersion(
    req.params.type,
    Number(req.params.version),
    req.user.id,
  );

  return sendSuccess(res, { message: 'Prompt version restored.', data: { prompt } });
});

module.exports = { list, getByType, update, publish, listVersions, restoreVersion };
