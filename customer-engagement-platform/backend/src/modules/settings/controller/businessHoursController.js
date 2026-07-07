const businessHoursService = require('../service/businessHoursService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const get = catchAsync(async (req, res) => {
  const businessHours = await businessHoursService.get();
  return sendSuccess(res, { message: 'Business hours retrieved.', data: { businessHours } });
});

const update = catchAsync(async (req, res) => {
  const businessHours = await businessHoursService.update(req.body);
  return sendSuccess(res, { message: 'Business hours updated.', data: { businessHours } });
});

const addHoliday = catchAsync(async (req, res) => {
  const businessHours = await businessHoursService.addHoliday(req.body);
  return sendSuccess(res, { statusCode: 201, message: 'Holiday added.', data: { businessHours } });
});

const removeHoliday = catchAsync(async (req, res) => {
  const businessHours = await businessHoursService.removeHoliday(req.params.holidayId);
  return sendSuccess(res, { message: 'Holiday removed.', data: { businessHours } });
});

const getStatus = catchAsync(async (req, res) => {
  const status = await businessHoursService.getStatus();
  return sendSuccess(res, { message: 'Business status retrieved.', data: { status } });
});

const getCallbackAvailability = catchAsync(async (req, res) => {
  const { proposedAt, count } = req.query;
  const availability = await businessHoursService.getCallbackAvailability({ proposedAt, count });
  return sendSuccess(res, { message: 'Callback availability retrieved.', data: { availability } });
});

module.exports = { get, update, addHoliday, removeHoliday, getStatus, getCallbackAvailability };
