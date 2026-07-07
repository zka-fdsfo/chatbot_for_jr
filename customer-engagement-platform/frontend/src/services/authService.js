import apiClient, { requestTokenRefresh } from './apiClient';

async function login(email, password) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data;
}

async function refresh() {
  return requestTokenRefresh();
}

async function logout() {
  await apiClient.post('/auth/logout');
}

async function getCurrentUser() {
  const response = await apiClient.get('/auth/me');
  return response.data;
}

export default { login, refresh, logout, getCurrentUser };
