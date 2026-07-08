import apiClient from './apiClient';

async function createSession() {
  const response = await apiClient.post('/visitors/sessions');
  return response.data;
}

async function getMySession(visitorToken) {
  const response = await apiClient.get('/visitors/sessions/me', {
    headers: { 'X-Visitor-Token': visitorToken },
  });
  return response.data;
}

async function updateMyProfile(visitorToken, updates) {
  const response = await apiClient.patch('/visitors/sessions/me', updates, {
    headers: { 'X-Visitor-Token': visitorToken },
  });
  return response.data;
}

// Sends `{}` rather than `null` — express.json()'s strict mode rejects a
// bare `null` body outright even though it's technically valid JSON.
async function endMySession(visitorToken) {
  const response = await apiClient.post('/visitors/sessions/end', {}, {
    headers: { 'X-Visitor-Token': visitorToken },
  });
  return response.data;
}

// Staff-facing (Executive/Admin) lookups — authenticated via the normal
// Authorization header (apiClient's interceptor), never a visitor token.
async function getByVisitorId(visitorId) {
  const response = await apiClient.get(`/visitors/${visitorId}`);
  return response.data;
}

async function getConversationHistory(visitorId, params = {}) {
  const response = await apiClient.get(`/visitors/${visitorId}/conversations`, { params });
  return response;
}

export default {
  createSession,
  getMySession,
  updateMyProfile,
  endMySession,
  getByVisitorId,
  getConversationHistory,
};
