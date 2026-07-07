import apiClient from './apiClient';

async function list() {
  const response = await apiClient.get('/prompts');
  return response.data;
}

async function getByType(type) {
  const response = await apiClient.get(`/prompts/${type}`);
  return response.data;
}

async function update(type, content) {
  const response = await apiClient.patch(`/prompts/${type}`, { content });
  return response.data;
}

async function publish(type) {
  const response = await apiClient.post(`/prompts/${type}/publish`);
  return response.data;
}

async function listVersions(type) {
  const response = await apiClient.get(`/prompts/${type}/versions`);
  return response.data;
}

async function restoreVersion(type, version) {
  const response = await apiClient.post(`/prompts/${type}/versions/${version}/restore`);
  return response.data;
}

export default { list, getByType, update, publish, listVersions, restoreVersion };
