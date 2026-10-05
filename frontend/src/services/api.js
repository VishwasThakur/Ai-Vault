// Base API URL configuration
// Prefers VITE_API_URL, falls back to live Render backend in production, or localhost:5000 in development
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://ai-vault-z3iv.onrender.com' : 'http://localhost:5000')
).replace(/\/+$/, '');

const API_BASE = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

const DEFAULT_TIMEOUT_MS = 60000; // 60s timeout to comfortably accommodate free-tier cold starts

const customFetch = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Server took too long to respond. The free-tier backend may still be waking up from sleep. Please try again.'
      );
    }
    if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
      throw new Error(
        'Unable to reach backend server. On free-tier hosting (Render), waking up takes 30-50 seconds. Please wait a moment and try again.'
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const getHeaders = (token, vaultToken, isFormData = false) => {
  const headers = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (vaultToken) {
    headers['x-vault-token'] = vaultToken;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    if (data.vaultLocked) {
      const err = new Error(data.message || 'Critical Vault locked');
      err.vaultLocked = true;
      throw err;
    }
    const err = new Error(data.message || 'Session expired or invalid credentials.');
    err.unauthorized = true;
    throw err;
  }
  if (!response.ok) {
    const err = new Error(data.message || (response.status === 404 ? 'Requested resource not found' : 'API request failed'));
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
};

export const loginUser = async (email, password) => {
  const res = await customFetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res);
};

export const registerUser = async (name, email, password, pin) => {
  const res = await customFetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name, email, password, pin }),
  });
  return handleResponse(res);
};

export const getProfile = async (token) => {
  const res = await customFetch(`${API_BASE}/auth/me`, {
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const getFiles = async (token, { folderId, search, type } = {}) => {
  const params = new URLSearchParams();
  if (folderId && folderId !== 'all') params.append('folderId', folderId);
  if (search && search.trim()) params.append('search', search.trim());
  if (type && type !== 'all') params.append('type', type);

  const res = await customFetch(`${API_BASE}/files?${params.toString()}`, {
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const uploadFile = async (token, file, folderId = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) {
    formData.append('folderId', folderId);
  }

  const res = await customFetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    headers: getHeaders(token, null, true),
    body: formData,
  });
  return handleResponse(res);
};

export const deleteFile = async (token, fileId) => {
  const res = await customFetch(`${API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const getFileDownloadUrl = (fileId, token) => {
  return `${API_BASE}/files/${fileId}/download?token=${encodeURIComponent(token)}`;
};

export const getFolders = async (token) => {
  const res = await customFetch(`${API_BASE}/folders`, {
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const createFolder = async (token, name) => {
  const res = await customFetch(`${API_BASE}/folders`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ name }),
  });
  return handleResponse(res);
};

export const deleteFolder = async (token, folderId) => {
  const res = await customFetch(`${API_BASE}/folders/${folderId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const summarizeFile = async (token, fileId) => {
  const res = await customFetch(`${API_BASE}/ai/summarize`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ fileId }),
  });
  return handleResponse(res);
};

export const askAI = async (token, fileId, question) => {
  const res = await customFetch(`${API_BASE}/ai/ask`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ fileId, question }),
  });
  return handleResponse(res);
};

export const getStats = async (token) => {
  const res = await customFetch(`${API_BASE}/stats`, {
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const unlockVault = async (token, pin) => {
  const res = await customFetch(`${API_BASE}/vault/unlock`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ pin }),
  });
  return handleResponse(res);
};

export const getVaultFiles = async (token, vaultToken) => {
  const res = await customFetch(`${API_BASE}/vault/files`, {
    headers: getHeaders(token, vaultToken),
  });
  return handleResponse(res);
};

export const uploadVaultFile = async (token, vaultToken, file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await customFetch(`${API_BASE}/vault/upload`, {
    method: 'POST',
    headers: getHeaders(token, vaultToken, true),
    body: formData,
  });
  return handleResponse(res);
};

export const deleteVaultFile = async (token, vaultToken, fileId) => {
  const res = await customFetch(`${API_BASE}/vault/files/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(token, vaultToken),
  });
  return handleResponse(res);
};

export const getVaultFileDownloadUrl = (fileId, token, vaultToken) => {
  return `${API_BASE}/vault/files/${fileId}/download?token=${encodeURIComponent(token)}&vaultToken=${encodeURIComponent(vaultToken)}`;
};

export const resetVaultPin = async (token, password, newPin) => {
  const res = await customFetch(`${API_BASE}/vault/reset-pin`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ password, newPin }),
  });
  return handleResponse(res);
};

export const moveFileFolder = async (token, fileId, folderId) => {
  const res = await customFetch(`${API_BASE}/files/${fileId}/folder`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ folderId }),
  });
  return handleResponse(res);
};

export const extractKeywords = async (token, fileId) => {
  const res = await customFetch(`${API_BASE}/ai/keywords`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ fileId }),
  });
  return handleResponse(res);
};

export const suggestCategory = async (token, fileId) => {
  const res = await customFetch(`${API_BASE}/ai/categorize`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ fileId }),
  });
  return handleResponse(res);
};

export const getNotes = async (token) => {
  const res = await customFetch(`${API_BASE}/notes`, {
    headers: getHeaders(token),
  });
  return handleResponse(res);
};

export const createNote = async (token, title, body) => {
  const res = await customFetch(`${API_BASE}/notes`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ title, body }),
  });
  return handleResponse(res);
};

export const updateNote = async (token, noteId, title, body) => {
  const res = await customFetch(`${API_BASE}/notes/${noteId}`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({ title, body }),
  });
  return handleResponse(res);
};

export const deleteNote = async (token, noteId) => {
  const res = await customFetch(`${API_BASE}/notes/${noteId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  });
  return handleResponse(res);
};
