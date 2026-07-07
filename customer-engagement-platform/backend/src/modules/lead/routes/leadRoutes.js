const express = require('express');
const leadController = require('../controller/leadController');
const {
  detectSchema,
  createLeadSchema,
  updateLeadSchema,
  updateStatusSchema,
  assignSchema,
  followUpSchema,
  convertSchema,
  markLostSchema,
  searchQuerySchema,
} = require('../validator/leadValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate, requirePermission(PERMISSIONS.MANAGE_LEADS));

router.post('/detect', validate(detectSchema), leadController.detect);

router.post('/', validate(createLeadSchema), leadController.create);
router.get('/', validate(searchQuerySchema, 'query'), leadController.search);

router.get('/:id', leadController.getById);
router.patch('/:id', validate(updateLeadSchema), leadController.update);
router.patch('/:id/status', validate(updateStatusSchema), leadController.updateStatus);
router.patch('/:id/assign', validate(assignSchema), leadController.assign);

router.post('/:id/summary', leadController.generateSummary);
router.patch('/:id/follow-up', validate(followUpSchema), leadController.scheduleFollowUp);
router.post('/:id/convert', validate(convertSchema), leadController.convert);
router.post('/:id/lost', validate(markLostSchema), leadController.markLost);

router.get('/:id/context', leadController.getContext);

module.exports = router;
