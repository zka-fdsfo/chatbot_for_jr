import apiClient from './apiClient';

async function get() {
  const response = await apiClient.get('/business-hours');
  return response.data;
}

async function update(updates) {
  const response = await apiClient.patch('/business-hours', updates);
  return response.data;
}

async function addHoliday(holiday) {
  const response = await apiClient.post('/business-hours/holidays', holiday);
  return response.data;
}

async function removeHoliday(holidayId) {
  const response = await apiClient.delete(`/business-hours/holidays/${holidayId}`);
  return response.data;
}

async function getStatus() {
  const response = await apiClient.get('/business-hours/status');
  return response.data;
}

async function getCallbackAvailability(params = {}) {
  const response = await apiClient.get('/business-hours/callback-availability', { params });
  return response.data;
}

export default { get, update, addHoliday, removeHoliday, getStatus, getCallbackAvailability };
