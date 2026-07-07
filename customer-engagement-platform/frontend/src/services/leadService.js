import apiClient from './apiClient';

async function detect(conversationId) {
  const response = await apiClient.post('/leads/detect', { conversationId });
  return response.data;
}

async function create(input) {
  const response = await apiClient.post('/leads', input);
  return response.data;
}

async function search(params = {}) {
  const response = await apiClient.get('/leads', { params });
  return response;
}

async function getById(id) {
  const response = await apiClient.get(`/leads/${id}`);
  return response.data;
}

async function update(id, updates) {
  const response = await apiClient.patch(`/leads/${id}`, updates);
  return response.data;
}

async function updateStatus(id, status) {
  const response = await apiClient.patch(`/leads/${id}/status`, { status });
  return response.data;
}

async function assign(id, assignedExecutiveId) {
  const response = await apiClient.patch(`/leads/${id}/assign`, { assignedExecutiveId });
  return response.data;
}

async function generateSummary(id) {
  const response = await apiClient.post(`/leads/${id}/summary`);
  return response.data;
}

async function scheduleFollowUp(id, input) {
  const response = await apiClient.patch(`/leads/${id}/follow-up`, input);
  return response.data;
}

async function convert(id, ticketId) {
  const response = await apiClient.post(`/leads/${id}/convert`, { ticketId: ticketId ?? null });
  return response.data;
}

async function markLost(id, reason) {
  const response = await apiClient.post(`/leads/${id}/lost`, { reason: reason ?? null });
  return response.data;
}

async function getContext(id) {
  const response = await apiClient.get(`/leads/${id}/context`);
  return response.data;
}

export default {
  detect,
  create,
  search,
  getById,
  update,
  updateStatus,
  assign,
  generateSummary,
  scheduleFollowUp,
  convert,
  markLost,
  getContext,
};
