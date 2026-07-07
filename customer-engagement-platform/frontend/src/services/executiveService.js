import apiClient from './apiClient';

async function getMe() {
  const response = await apiClient.get('/executives/me');
  return response.data;
}

async function updateMyStatus(status) {
  const response = await apiClient.patch('/executives/me/status', { status });
  return response.data;
}

async function list(params = {}) {
  const response = await apiClient.get('/executives', { params });
  return response;
}

async function create(input) {
  const response = await apiClient.post('/executives', input);
  return response.data;
}

async function update(id, updates) {
  const response = await apiClient.patch(`/executives/${id}`, updates);
  return response.data;
}

async function activate(id) {
  const response = await apiClient.patch(`/executives/${id}/activate`);
  return response.data;
}

async function deactivate(id) {
  const response = await apiClient.patch(`/executives/${id}/deactivate`);
  return response.data;
}

async function resetPassword(id, password) {
  const response = await apiClient.post(`/executives/${id}/reset-password`, { password });
  return response.data;
}

export default { getMe, updateMyStatus, list, create, update, activate, deactivate, resetPassword };
