// src/utils/api.js

// ---- Base URL ----
// Use the Vercel/Vite env var first, then fall back to your Node backend on Railway.
const API_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  'https://sentryprime-backend-v2-production.up.railway.app';

// ---- Storage Keys ----
const TOKEN_KEY = 'sentryprime_token';
const USER_KEY = 'sentryprime_user';

// ---- Auth helpers ----
const getAuthToken = ( ) => localStorage.getItem(TOKEN_KEY);

// ---- Fetch wrapper ----
async function makeRequest(endpoint, options = {}) {
  const token = getAuthToken();

  // Normalize base and endpoint
  const base = (API_BASE_URL || '').replace(/\/+$/, ''); // remove trailing slashes
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${base}${path}`;

  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  };

  // Helpful debug line (keep for now)
  console.debug('API fetch →', url, config);

  const res = await fetch(url, config);
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  // Parse JSON if present
  let data;
  if (contentType.includes('application/json') && text) {
    try { data = JSON.parse(text); } catch { /* ignore parse error */ }
  }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }

  // If no JSON body, return a simple success object
  return data === undefined ? { success: true } : data;
}

// ---- Auth API ----
export const auth = {
  register: async (userData) => {
    const resp = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    if (resp.token) {
      localStorage.setItem(TOKEN_KEY, resp.token);
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
    }
    return resp;
  },

  login: async (credentials) => {
    const resp = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    if (resp.token) {
      localStorage.setItem(TOKEN_KEY, resp.token);
      localStorage.setItem(USER_KEY, JSON.stringify(resp.user));
    }
    return resp;
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  isAuthenticated: () => !!getAuthToken(),

  getCurrentUser: () => {
    const s = localStorage.getItem(USER_KEY);
    try { return s ? JSON.parse(s) : null; } catch { return null; }
  },
};

// ---- Dashboard API ----
export const dashboard = {
  getStats: async () => {
    const r = await makeRequest('/api/dashboard/stats');
    return r.overview || { totalWebsites: 0, totalScans: 0, avgCompliance: 0, totalViolations: 0 };
  },

  getWebsites: async () => {
    const r = await makeRequest('/api/dashboard/websites');
    return r.websites || [];
  },

  getScans: async () => {
    const r = await makeRequest('/api/dashboard/scans');
    return r.scans || [];
  },
};

// ---- Websites API ----
export const websites = {
  add: (websiteData) =>
    makeRequest('/api/dashboard/websites', {
      method: 'POST',
      body: JSON.stringify(websiteData),
    }),

  delete: (websiteId) =>
    makeRequest(`/api/websites/${websiteId}`, { method: 'DELETE' }),

  get: (websiteId) =>
    makeRequest(`/api/websites/${websiteId}`),

  update: (websiteId, websiteData) =>
    makeRequest(`/api/websites/${websiteId}`, {
      method: 'PUT',
      body: JSON.stringify(websiteData),
    }),
};

// Scanning API
export const scanning = {
  // Start a new scan (uses backend ID)
  startScan: async (websiteId, options = {}) => {
    // get URL from backend's websites list (keeps a single source of truth)
    const list = await dashboard.getWebsites();
    const w = list.find(x => x.id === websiteId);
    if (!w) throw new Error('Website not found');

    const res = await makeRequest('/api/dashboard/scans', {
      method: 'POST',
      body: JSON.stringify({
        website_id: websiteId,
        url: w.url,
        ...options,
      }),
    });

    // IMPORTANT: res.id is the scan id we must use everywhere
    if (!res?.id) throw new Error('Backend did not return a scan id');
    return res; // { id, url, status, ... }
  },

  // Get scan results
  getScanResults: async (scanId) => {
    return await makeRequest(`/api/scans/${scanId}/results`);
  },

  // Get AI analysis for a scan
  getAIAnalysis: async (scanId) => {
    return await makeRequest('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ scan_id: scanId }),
    });
  },
};


// ---- Health ----
export const health = {
  check: () => makeRequest('/'),
};

// Default export
const api = { auth, dashboard, websites, scanning, health };
export default api;
