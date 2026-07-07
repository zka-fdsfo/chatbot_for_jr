const visitorService = require('../modules/visitor/service/visitorService');
const catchAsync = require('../utils/catchAsync');

const VISITOR_TOKEN_HEADER = 'x-visitor-token';

const requireVisitorSession = catchAsync(async (req, res, next) => {
  const token = req.headers[VISITOR_TOKEN_HEADER];
  const { visitor, session, visitorToken } = await visitorService.restoreSession(token);

  req.visitor = visitor;
  req.visitorSession = session;
  req.visitorToken = visitorToken;

  next();
});

const attachVisitorSession = catchAsync(async (req, res, next) => {
  const token = req.headers[VISITOR_TOKEN_HEADER];

  try {
    const { visitor, session, visitorToken } = await visitorService.restoreSession(token);
    req.visitor = visitor;
    req.visitorSession = session;
    req.visitorToken = visitorToken;
  } catch {
    req.visitor = null;
    req.visitorSession = null;
    req.visitorToken = null;
  }

  next();
});

module.exports = { requireVisitorSession, attachVisitorSession, VISITOR_TOKEN_HEADER };
