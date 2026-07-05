import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const csrfClient = axios.create({
  baseURL,
  withCredentials: true
});

const unsafeMethods = new Set(['post', 'put', 'patch', 'delete']);

let csrfToken = null;
let csrfRequest = null;
let isRefreshing = false;
let refreshRequest = null;
let failedQueue = [];

const getCookieValue = (name) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const processQueue = (error) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });

  failedQueue = [];
};

export const initializeCsrf = async ({ force = false } = {}) => {
  if (!force) {
    csrfToken = csrfToken || getCookieValue('csrfToken');
    if (csrfToken) {
      return csrfToken;
    }
  }

  if (!csrfRequest || force) {
    csrfRequest = csrfClient.get('/csrf-token')
      .then((response) => {
        csrfToken = response.data?.csrfToken || getCookieValue('csrfToken');
        return csrfToken;
      })
      .finally(() => {
        csrfRequest = null;
      });
  }

  return csrfRequest;
};

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase();

  if (unsafeMethods.has(method)) {
    const token = await initializeCsrf();
    if (token) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = token;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 403 &&
      error.response?.data?.code === 'CSRF_INVALID' &&
      !originalRequest?._csrfRetry
    ) {
      originalRequest._csrfRetry = true;
      await initializeCsrf({ force: true });
      return api(originalRequest);
    }

    if (originalRequest?.url === '/auth/refresh') {
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !originalRequest?._retry
    ) {
      if (isRefreshing && refreshRequest) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch((refreshError) => Promise.reject(refreshError));
      }

      originalRequest._retry = true;
      isRefreshing = true;
      refreshRequest = api.post('/auth/refresh');

      try {
        await refreshRequest;
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
        refreshRequest = null;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
