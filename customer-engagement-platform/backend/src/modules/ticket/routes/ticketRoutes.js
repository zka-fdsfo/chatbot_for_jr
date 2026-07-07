const express = require('express');
const ticketController = require('../controller/ticketController');
const {
  createTicketSchema,
  updateTicketSchema,
  updateStatusSchema,
  assignSchema,
  addNoteSchema,
  searchQuerySchema,
} = require('../validator/ticketValidator');
const validate = require('../../../middleware/validate');
const authenticate = require('../../../middleware/authenticate');
const { requirePermission, requireRole } = require('../../../middleware/authorize');
const { PERMISSIONS } = require('../../../shared/constants/permissions');
const { ROLES } = require('../../../shared/constants/roles');

const router = express.Router();

router.use(authenticate, requirePermission(PERMISSIONS.MANAGE_TICKETS));

router.post('/', validate(createTicketSchema), ticketController.create);
router.get('/', validate(searchQuerySchema, 'query'), ticketController.search);

router.get('/:id', ticketController.getById);
router.patch('/:id', validate(updateTicketSchema), ticketController.update);
router.patch('/:id/status', validate(updateStatusSchema), ticketController.updateStatus);
router.patch('/:id/assign', validate(assignSchema), ticketController.assign);

router.get('/:id/notes', ticketController.listNotes);
router.post('/:id/notes', validate(addNoteSchema), ticketController.addNote);

router.get('/:id/audit', ticketController.listAudit);
router.get('/:id/context', ticketController.getContext);

// Admin-only (TICKET_SYSTEM.md §13) — MANAGE_TICKETS above is shared with
// EXECUTIVE, so these two need an additional role check.
router.delete('/:id', requireRole(ROLES.ADMIN), ticketController.softDelete);
router.post('/:id/restore', requireRole(ROLES.ADMIN), ticketController.restore);

module.exports = router;
