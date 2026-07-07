const express = require('express');
const promptController = require('../controller/promptController');
const {
  promptTypeParamSchema,
  promptVersionParamSchema,
  updatePromptSchema,
} = require('../validator/promptValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate, requirePermission(PERMISSIONS.CONFIGURE_AI));

router.get('/', promptController.list);
router.get('/:type', validate(promptTypeParamSchema, 'params'), promptController.getByType);
router.patch(
  '/:type',
  validate(promptTypeParamSchema, 'params'),
  validate(updatePromptSchema),
  promptController.update,
);
router.post('/:type/publish', validate(promptTypeParamSchema, 'params'), promptController.publish);
router.get(
  '/:type/versions',
  validate(promptTypeParamSchema, 'params'),
  promptController.listVersions,
);
router.post(
  '/:type/versions/:version/restore',
  validate(promptVersionParamSchema, 'params'),
  promptController.restoreVersion,
);

module.exports = router;
