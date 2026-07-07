const ticketService = require('../service/ticketService');
const { sendSuccess } = require('../../../shared/responses/apiResponse');
const catchAsync = require('../../../utils/catchAsync');

const create = catchAsync(async (req, res) => {
  const ticket = await ticketService.create(req.body, req.user.id);

  return sendSuccess(res, { statusCode: 201, message: 'Ticket created.', data: { ticket } });
});

const search = catchAsync(async (req, res) => {
  const { status, priority, category, assignedExecutiveId, visitorId, ticketNumber, from, to, includeDeleted, page, limit } =
    req.query;

  const { items, total } = await ticketService.search(
    { status, priority, category, assignedExecutiveId, visitorId, ticketNumber, from, to, includeDeleted },
    { page, limit },
    req.user,
  );

  return sendSuccess(res, {
    message: 'Tickets retrieved.',
    data: { tickets: items },
    meta: { total, page: page ?? 1, limit: limit ?? 20 },
  });
});

const getById = catchAsync(async (req, res) => {
  const ticket = await ticketService.getById(req.params.id, req.user);

  return sendSuccess(res, { message: 'Ticket retrieved.', data: { ticket } });
});

const update = catchAsync(async (req, res) => {
  const ticket = await ticketService.update(req.params.id, req.body, req.user);

  return sendSuccess(res, { message: 'Ticket updated.', data: { ticket } });
});

const updateStatus = catchAsync(async (req, res) => {
  const ticket = await ticketService.updateStatus(req.params.id, req.body.status, req.user);

  return sendSuccess(res, { message: 'Ticket status updated.', data: { ticket } });
});

const assign = catchAsync(async (req, res) => {
  const ticket = await ticketService.assign(req.params.id, req.body.assignedExecutiveId, req.user);

  return sendSuccess(res, { message: 'Ticket assigned.', data: { ticket } });
});

const addNote = catchAsync(async (req, res) => {
  const note = await ticketService.addNote(req.params.id, req.body.content, req.user);

  return sendSuccess(res, { statusCode: 201, message: 'Note added.', data: { note } });
});

const listNotes = catchAsync(async (req, res) => {
  const notes = await ticketService.listNotes(req.params.id, req.user);

  return sendSuccess(res, { message: 'Notes retrieved.', data: { notes } });
});

const listAudit = catchAsync(async (req, res) => {
  const audit = await ticketService.listAudit(req.params.id, req.user);

  return sendSuccess(res, { message: 'Audit trail retrieved.', data: { audit } });
});

const getContext = catchAsync(async (req, res) => {
  const context = await ticketService.getContext(req.params.id, req.user);

  return sendSuccess(res, { message: 'Ticket context retrieved.', data: { context } });
});

const softDelete = catchAsync(async (req, res) => {
  const ticket = await ticketService.softDelete(req.params.id, req.user);

  return sendSuccess(res, { message: 'Ticket deleted.', data: { ticket } });
});

const restore = catchAsync(async (req, res) => {
  const ticket = await ticketService.restore(req.params.id, req.user);

  return sendSuccess(res, { message: 'Ticket restored.', data: { ticket } });
});

module.exports = {
  create,
  search,
  getById,
  update,
  updateStatus,
  assign,
  addNote,
  listNotes,
  listAudit,
  getContext,
  softDelete,
  restore,
};
