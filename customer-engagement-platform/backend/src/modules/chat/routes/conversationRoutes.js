const express = require('express');
const conversationController = require('../controller/conversationController');
const {
  listConversationsQuerySchema,
  paginationQuerySchema,
  updateStatusSchema,
  reassignSchema,
} = require('../validator/chatValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.VIEW_OWN_CONVERSATION));

router.get('/', validate(listConversationsQuerySchema, 'query'), conversationController.list);
router.get('/:id', conversationController.getById);
router.get(
  '/:id/messages',
  validate(paginationQuerySchema, 'query'),
  conversationController.listMessages,
);
router.post('/:id/close', conversationController.close);
// PATCH .../status, POST .../archive, .../restore, and reassign are all
// gated ADMIN-only *inside* the service (see conversationService.js) —
// same pattern as Lead's ARCHIVED entry/exit — rather than a separate
// route-level permission, since VIEW_OWN_CONVERSATION is shared by both
// roles and the ownership/role distinction is finer-grained than a route.
router.patch('/:id/status', validate(updateStatusSchema), conversationController.updateStatus);
router.patch('/:id/assign', validate(reassignSchema), conversationController.reassign);
router.post('/:id/archive', conversationController.archive);
router.post('/:id/restore', conversationController.restore);
router.get('/:id/audit', conversationController.listAudit);
router.post('/:id/summary', conversationController.generateSummary);
router.get('/:id/summary', conversationController.getSummary);

module.exports = router;
