import apiClient from './apiClient';

async function list(params = {}) {
  const response = await apiClient.get('/conversations', { params });
  return response;
}

async function getById(id) {
  const response = await apiClient.get(`/conversations/${id}`);
  return response.data;
}

async function listMessages(id, params = {}) {
  const response = await apiClient.get(`/conversations/${id}/messages`, { params });
  return response;
}

async function close(id) {
  const response = await apiClient.post(`/conversations/${id}/close`);
  return response.data;
}

async function generateSummary(id) {
  const response = await apiClient.post(`/conversations/${id}/summary`);
  return response.data;
}

async function getSummary(id) {
  const response = await apiClient.get(`/conversations/${id}/summary`);
  return response.data;
}

export default { list, getById, listMessages, close, generateSummary, getSummary };
