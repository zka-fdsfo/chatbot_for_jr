const express = require('express');
const visitorController = require('../controller/visitorController');
const { requireVisitorSession } = require('../../../middleware/visitorSession');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.post('/sessions', visitorController.createSession);
router.get('/sessions/me', requireVisitorSession, visitorController.me);

// Staff-facing (Executive/Admin) visitor lookup — distinct auth from the
// visitor-token routes above; never accepts a visitor token.
router.get(
  '/:visitorId',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_OWN_CONVERSATION),
  visitorController.getByVisitorId,
);
router.get(
  '/:visitorId/conversations',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_OWN_CONVERSATION),
  visitorController.getConversationHistory,
);

module.exports = router;
