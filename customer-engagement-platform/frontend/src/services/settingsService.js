import apiClient from './apiClient';

async function getAISettings() {
  const response = await apiClient.get('/settings/ai');
  return response.data;
}

async function updateAISettings(updates) {
  const response = await apiClient.patch('/settings/ai', updates);
  return response.data;
}

async function getWidgetSettings() {
  const response = await apiClient.get('/settings/widget');
  return response.data;
}

async function updateWidgetSettings(updates) {
  const response = await apiClient.patch('/settings/widget', updates);
  return response.data;
}

export default { getAISettings, updateAISettings, getWidgetSettings, updateWidgetSettings };
