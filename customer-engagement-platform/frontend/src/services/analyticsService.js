import apiClient from './apiClient';

async function getDashboard() {
  const response = await apiClient.get('/analytics/dashboard');
  return response.data;
}

async function getConversations(params = {}) {
  const response = await apiClient.get('/analytics/conversations', { params });
  return response.data;
}

async function getAi(params = {}) {
  const response = await apiClient.get('/analytics/ai', { params });
  return response.data;
}

async function getExecutives(params = {}) {
  const response = await apiClient.get('/analytics/executives', { params });
  return response.data;
}

async function getLeads(params = {}) {
  const response = await apiClient.get('/analytics/leads', { params });
  return response.data;
}

async function getTickets(params = {}) {
  const response = await apiClient.get('/analytics/tickets', { params });
  return response.data;
}

async function getVisitors(params = {}) {
  const response = await apiClient.get('/analytics/visitors', { params });
  return response.data;
}

async function getWidget(params = {}) {
  const response = await apiClient.get('/analytics/widget', { params });
  return response.data;
}

async function getBusinessHours(params = {}) {
  const response = await apiClient.get('/analytics/business-hours', { params });
  return response.data;
}

// Public, best-effort — never lets a tracking failure surface to the
// visitor (ANALYTICS.md §22: analytics must not affect the app itself).
async function recordEvent(type, payload = {}) {
  try {
    await apiClient.post('/analytics/events', { type, payload });
  } catch {
    /* tracking is best-effort only */
  }
}

export default {
  getDashboard,
  getConversations,
  getAi,
  getExecutives,
  getLeads,
  getTickets,
  getVisitors,
  getWidget,
  getBusinessHours,
  recordEvent,
};
