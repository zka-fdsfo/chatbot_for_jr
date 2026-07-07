const express = require('express');
const healthRoutes = require('../../modules/health/healthRoutes');
const authRoutes = require('../../modules/auth/routes/authRoutes');
const visitorRoutes = require('../../modules/visitor/routes/visitorRoutes');
const knowledgeRoutes = require('../../modules/knowledge/routes/knowledgeRoutes');
const conversationRoutes = require('../../modules/chat/routes/conversationRoutes');
const executiveRoutes = require('../../modules/executive/routes/executiveRoutes');
const promptRoutes = require('../../modules/ai/routes/promptRoutes');
const settingsRoutes = require('../../modules/settings/routes/settingsRoutes');
const dashboardRoutes = require('../../modules/admin/routes/dashboardRoutes');
const ticketRoutes = require('../../modules/ticket/routes/ticketRoutes');
const leadRoutes = require('../../modules/lead/routes/leadRoutes');
const businessHoursRoutes = require('../../modules/settings/routes/businessHoursRoutes');
const analyticsRoutes = require('../../modules/analytics/routes/analyticsRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/visitors', visitorRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/conversations', conversationRoutes);
router.use('/executives', executiveRoutes);
router.use('/prompts', promptRoutes);
router.use('/settings', settingsRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/tickets', ticketRoutes);
router.use('/leads', leadRoutes);
router.use('/business-hours', businessHoursRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
