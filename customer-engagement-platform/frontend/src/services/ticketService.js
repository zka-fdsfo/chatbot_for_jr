import apiClient from './apiClient';

async function create(input) {
  const response = await apiClient.post('/tickets', input);
  return response.data;
}

async function search(params = {}) {
  const response = await apiClient.get('/tickets', { params });
  return response;
}

async function getById(id) {
  const response = await apiClient.get(`/tickets/${id}`);
  return response.data;
}

async function update(id, updates) {
  const response = await apiClient.patch(`/tickets/${id}`, updates);
  return response.data;
}

async function updateStatus(id, status) {
  const response = await apiClient.patch(`/tickets/${id}/status`, { status });
  return response.data;
}

async function assign(id, assignedExecutiveId) {
  const response = await apiClient.patch(`/tickets/${id}/assign`, { assignedExecutiveId });
  return response.data;
}

async function listNotes(id) {
  const response = await apiClient.get(`/tickets/${id}/notes`);
  return response.data;
}

async function addNote(id, content) {
  const response = await apiClient.post(`/tickets/${id}/notes`, { content });
  return response.data;
}

async function listAudit(id) {
  const response = await apiClient.get(`/tickets/${id}/audit`);
  return response.data;
}

async function getContext(id) {
  const response = await apiClient.get(`/tickets/${id}/context`);
  return response.data;
}

async function softDelete(id) {
  const response = await apiClient.delete(`/tickets/${id}`);
  return response.data;
}

async function restore(id) {
  const response = await apiClient.post(`/tickets/${id}/restore`);
  return response.data;
}

export default {
  create,
  search,
  getById,
  update,
  updateStatus,
  assign,
  listNotes,
  addNote,
  listAudit,
  getContext,
  softDelete,
  restore,
};
