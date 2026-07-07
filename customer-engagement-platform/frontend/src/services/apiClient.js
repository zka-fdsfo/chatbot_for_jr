import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.99.196:3000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let accessToken = null;
let refreshPromise = null;
let onSessionExpired = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

export function setOnSessionExpired(callback) {
  onSessionExpired = callback;
}

function mapError(error) {
  const message = error.response?.data?.message || error.message || 'Unexpected error occurred.';
  const errors = error.response?.data?.errors || [];

  return { message, errors, statusCode: error.response?.status };
}

// Refresh tokens rotate (single-use), so concurrent callers (e.g. React
// StrictMode double-invoking an effect, or a 401 retry racing a manual
// refresh) must share one in-flight request instead of each spending the
// same refresh token — otherwise the second caller's request is rejected
// with the token the first caller just rotated away.
export function requestTokenRefresh() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((response) => response.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const isAuthEndpoint = /\/auth\/(login|refresh)$/.test(originalRequest?.url ?? '');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const data = await requestTokenRefresh();
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return await apiClient(originalRequest);
      } catch (refreshError) {
        clearAccessToken();
        onSessionExpired?.();

        return Promise.reject(mapError(refreshError));
      }
    }

    return Promise.reject(mapError(error));
  },
);

export default apiClient;
