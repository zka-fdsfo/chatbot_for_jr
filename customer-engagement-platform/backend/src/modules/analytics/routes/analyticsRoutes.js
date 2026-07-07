const express = require('express');
const analyticsController = require('../controller/analyticsController');
const {
  rangeQuerySchema,
  executiveMetricsQuerySchema,
  recordEventSchema,
} = require('../validator/analyticsValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

// Public — the Chat Widget is anonymous and has no other way to report
// widget-usage events (ANALYTICS.md §12); restricted to CLIENT_EVENT_TYPES
// by the validator so nothing else can be spoofed in.
router.post('/events', validate(recordEventSchema), analyticsController.recordEvent);

router.get(
  '/dashboard',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  analyticsController.getDashboard,
);

router.get(
  '/conversations',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getConversations,
);

router.get(
  '/ai',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getAi,
);

// ANALYTICS.md §18: "Executives: View personal analytics only" — no
// VIEW_ANALYTICS permission gate here (Executives don't hold it); the
// service layer force-scopes a non-Admin caller to their own id instead,
// same pattern as Tickets'/Leads' assertAccessible.
router.get(
  '/executives',
  authenticate,
  validate(executiveMetricsQuerySchema, 'query'),
  analyticsController.getExecutives,
);

router.get(
  '/leads',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getLeads,
);

router.get(
  '/tickets',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getTickets,
);

router.get(
  '/visitors',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getVisitors,
);

router.get(
  '/widget',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getWidget,
);

router.get(
  '/business-hours',
  authenticate,
  requirePermission(PERMISSIONS.VIEW_ANALYTICS),
  validate(rangeQuerySchema, 'query'),
  analyticsController.getBusinessHours,
);

module.exports = router;
