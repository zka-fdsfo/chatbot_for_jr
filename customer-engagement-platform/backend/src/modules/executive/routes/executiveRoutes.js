const express = require('express');
const executiveController = require('../controller/executiveController');
const {
  updateStatusSchema,
  listExecutivesQuerySchema,
  createExecutiveSchema,
  updateExecutiveSchema,
  resetPasswordSchema,
} = require('../validator/executiveValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate);

router.get('/me', executiveController.getMe);
router.patch('/me/status', validate(updateStatusSchema), executiveController.updateMyStatus);
router.get('/', validate(listExecutivesQuerySchema, 'query'), executiveController.list);

// Admin-only Executive Management (ADMIN_PANEL.md §11) — distinct from the
// self-service routes above.
router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_EXECUTIVES),
  validate(createExecutiveSchema),
  executiveController.create,
);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_EXECUTIVES),
  validate(updateExecutiveSchema),
  executiveController.update,
);

router.patch(
  '/:id/activate',
  requirePermission(PERMISSIONS.MANAGE_EXECUTIVES),
  executiveController.activate,
);

router.patch(
  '/:id/deactivate',
  requirePermission(PERMISSIONS.MANAGE_EXECUTIVES),
  executiveController.deactivate,
);

router.post(
  '/:id/reset-password',
  requirePermission(PERMISSIONS.MANAGE_EXECUTIVES),
  validate(resetPasswordSchema),
  executiveController.resetPassword,
);

module.exports = router;
