function sendSuccess(res, { statusCode = 200, message = 'Success', data = null, meta = null } = {}) {
  const body = { success: true, message };

  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;

  return res.status(statusCode).json(body);
}

function sendError(res, { statusCode = 500, message = 'Internal server error', errors = [] } = {}) {
  return res.status(statusCode).json({ success: false, message, errors });
}

module.exports = { sendSuccess, sendError };
