const express = require('express');
const businessHoursController = require('../controller/businessHoursController');
const {
  updateBusinessHoursSchema,
  addHolidaySchema,
  callbackAvailabilityQuerySchema,
} = require('../validator/businessHoursValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

// Public — BUSINESS_HOURS.md §19: "Read access is available to all
// business modules," and the Chat Widget (anonymous) needs current
// status/callback availability before any visitor session exists, same
// reasoning as GET /settings/widget.
router.get('/status', businessHoursController.getStatus);
router.get(
  '/callback-availability',
  validate(callbackAvailabilityQuerySchema, 'query'),
  businessHoursController.getCallbackAvailability,
);

router.get('/', authenticate, businessHoursController.get);

router.patch(
  '/',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_BUSINESS_HOURS),
  validate(updateBusinessHoursSchema),
  businessHoursController.update,
);

router.post(
  '/holidays',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_BUSINESS_HOURS),
  validate(addHolidaySchema),
  businessHoursController.addHoliday,
);

router.delete(
  '/holidays/:holidayId',
  authenticate,
  requirePermission(PERMISSIONS.MANAGE_BUSINESS_HOURS),
  businessHoursController.removeHoliday,
);

module.exports = router;
