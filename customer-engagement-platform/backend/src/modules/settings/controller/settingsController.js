const aiSettingsService = require('../service/aiSettingsService');
const widgetSettingsService = require('../service/widgetSettingsService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const getAISettings = catchAsync(async (req, res) => {
  const settings = await aiSettingsService.get();
  return sendSuccess(res, { message: 'AI settings retrieved.', data: { settings } });
});

const updateAISettings = catchAsync(async (req, res) => {
  const settings = await aiSettingsService.update(req.body, req.user.id);
  return sendSuccess(res, { message: 'AI settings updated.', data: { settings } });
});

const getWidgetSettings = catchAsync(async (req, res) => {
  const settings = await widgetSettingsService.get();
  return sendSuccess(res, { message: 'Widget settings retrieved.', data: { settings } });
});

const updateWidgetSettings = catchAsync(async (req, res) => {
  const settings = await widgetSettingsService.update(req.body, req.user.id);
  return sendSuccess(res, { message: 'Widget settings updated.', data: { settings } });
});

module.exports = { getAISettings, updateAISettings, getWidgetSettings, updateWidgetSettings };
