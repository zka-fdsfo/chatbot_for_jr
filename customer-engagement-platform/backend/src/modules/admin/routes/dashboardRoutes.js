const express = require('express');
const dashboardController = require('../controller/dashboardController');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate, requirePermission(PERMISSIONS.VIEW_DASHBOARD));

router.get('/metrics', dashboardController.getMetrics);

module.exports = router;
