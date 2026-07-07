const express = require('express');
const settingsController = require('../controller/settingsController');
const { updateAISettingsSchema, updateWidgetSettingsSchema } = require('../validator/settingsValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

// Public — the anonymous Chat Widget fetches its own display config before
// a visitor session even exists, so this cannot sit behind `authenticate`.
router.get('/widget', settingsController.getWidgetSettings);

router.patch(
  '/widget',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_WIDGET_SETTINGS),
  validate(updateWidgetSettingsSchema),
  settingsController.updateWidgetSettings,
);

router.get(
  '/ai',
  authenticate,
  requirePermission(PERMISSIONS.CONFIGURE_AI),
  settingsController.getAISettings,
);

router.patch(
  '/ai',
  authenticate,
  requirePermission(PERMISSIONS.CONFIGURE_AI),
  validate(updateAISettingsSchema),
  settingsController.updateAISettings,
);

module.exports = router;
