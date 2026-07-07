const express = require('express');
const knowledgeController = require('../controller/knowledgeController');
const {
  createKnowledgeSchema,
  updateKnowledgeSchema,
  searchQuerySchema,
} = require('../validator/knowledgeValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  requirePermission(PERMISSIONS.MANAGE_KNOWLEDGE_BASE),
  validate(createKnowledgeSchema),
  knowledgeController.create,
);

router.get(
  '/',
  requirePermission(PERMISSIONS.VIEW_KNOWLEDGE_BASE),
  validate(searchQuerySchema, 'query'),
  knowledgeController.search,
);

router.get(
  '/slug/:slug',
  requirePermission(PERMISSIONS.VIEW_KNOWLEDGE_BASE),
  knowledgeController.getBySlug,
);

router.get('/:id', requirePermission(PERMISSIONS.VIEW_KNOWLEDGE_BASE), knowledgeController.getById);

router.patch(
  '/:id',
  requirePermission(PERMISSIONS.MANAGE_KNOWLEDGE_BASE),
  validate(updateKnowledgeSchema),
  knowledgeController.update,
);

router.post(
  '/:id/publish',
  requirePermission(PERMISSIONS.MANAGE_KNOWLEDGE_BASE),
  knowledgeController.publish,
);

router.post(
  '/:id/archive',
  requirePermission(PERMISSIONS.MANAGE_KNOWLEDGE_BASE),
  knowledgeController.archive,
);

router.get(
  '/:id/versions',
  requirePermission(PERMISSIONS.VIEW_KNOWLEDGE_BASE),
  knowledgeController.listVersions,
);

router.post(
  '/:id/versions/:version/restore',
  requirePermission(PERMISSIONS.MANAGE_KNOWLEDGE_BASE),
  knowledgeController.restoreVersion,
);

module.exports = router;
