import apiClient from './apiClient';

async function getMetrics() {
  const response = await apiClient.get('/admin/dashboard/metrics');
  return response.data;
}

export default { getMetrics };
