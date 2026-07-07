const dashboardService = require('../service/dashboardService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const getMetrics = catchAsync(async (req, res) => {
  const metrics = await dashboardService.getMetrics();
  return sendSuccess(res, { message: 'Dashboard metrics retrieved.', data: { metrics } });
});

module.exports = { getMetrics };
