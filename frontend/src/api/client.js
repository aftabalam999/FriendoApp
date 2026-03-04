let envUrl = import.meta.env.VITE_API_URL || '';
envUrl = envUrl.replace(/\/$/, ''); // Remove trailing slash
if (!envUrl.endsWith('/api')) {
  envUrl = envUrl ? `${envUrl}/api` : '/api';
}
const API_URL = envUrl;

const REQUEST_TIMEOUT_MS = 15000; // 15 seconds — prevents hanging requests

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const fetchWithTimeout = (url, options) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
};

const handleResponse = async (response) => {
  // Parse body regardless of status — works on error responses too
  let data;
  const contentType = response.headers.get('content-type') || '';
  try {
    data = contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() };
  } catch {
    data = { message: 'Invalid server response' };
  }

  if (response.status === 401) {
    // Only auto-redirect to login if NOT already on an auth page
    const authPages = ['/login', '/register', '/forgot-password'];
    if (!authPages.some(p => window.location.pathname.startsWith(p))) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    const err = new Error(data.message || 'Unauthorized');
    err.response = { data, status: 401 };
    throw err;
  }

  if (!response.ok) {
    const err = new Error(data.message || 'Something went wrong');
    err.response = { data, status: response.status };
    throw err;
  }
  return data;
};

export const api = {
  get: async (endpoint) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders()
    });
    return handleResponse(response);
  },

  post: async (endpoint, body) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  put: async (endpoint, body) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(response);
  },

  upload: async (endpoint, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    // No Content-Type header — browser sets multipart boundary automatically
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    });
    return handleResponse(response);
  },

  delete: async (endpoint) => {
    const response = await fetchWithTimeout(`${API_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(response);
  }
};
