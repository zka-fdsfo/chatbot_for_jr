import apiClient from './apiClient';

async function search(params = {}) {
  const response = await apiClient.get('/knowledge', { params });
  return response;
}

async function getById(id) {
  const response = await apiClient.get(`/knowledge/${id}`);
  return response.data;
}

async function create(input) {
  const response = await apiClient.post('/knowledge', input);
  return response.data;
}

async function update(id, updates) {
  const response = await apiClient.patch(`/knowledge/${id}`, updates);
  return response.data;
}

async function publish(id) {
  const response = await apiClient.post(`/knowledge/${id}/publish`);
  return response.data;
}

async function archive(id) {
  const response = await apiClient.post(`/knowledge/${id}/archive`);
  return response.data;
}

async function listVersions(id) {
  const response = await apiClient.get(`/knowledge/${id}/versions`);
  return response.data;
}

async function restoreVersion(id, version) {
  const response = await apiClient.post(`/knowledge/${id}/versions/${version}/restore`);
  return response.data;
}

export default { search, getById, create, update, publish, archive, listVersions, restoreVersion };
