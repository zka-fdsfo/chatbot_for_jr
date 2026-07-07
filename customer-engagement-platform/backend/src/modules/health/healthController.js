const mongoose = require('mongoose');
const { sendSuccess } = require('../../shared/responses/apiResponse');
const catchAsync = require('../../utils/catchAsync');

const MONGOOSE_READY_STATE = 1;

const getHealth = catchAsync(async (req, res) => {
  const isDatabaseConnected = mongoose.connection.readyState === MONGOOSE_READY_STATE;

  return sendSuccess(res, {
    message: 'Service is healthy.',
    data: {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: isDatabaseConnected ? 'connected' : 'disconnected',
    },
  });
});

module.exports = { getHealth };
