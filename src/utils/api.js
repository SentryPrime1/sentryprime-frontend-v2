// STEP 2: Update your src/utils/api.js file

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const token = localStorage.getItem('sentryprime_token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };
  
  const response = await fetch(url, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export const auth = {
  register: async (userData) => {
    return await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  login: async (credentials) => {
    return await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
};

export const dashboard = {
  getOverview: async () => {
    return await makeRequest('/api/dashboard/overview');
  },
  
  getWebsites: async () => {
    const response = await makeRequest('/api/dashboard/websites');
    return response.websites || [];
  },
  
  getScans: async () => {
    const response = await makeRequest('/api/dashboard/scans');
    return response.scans || [];
  },
};

export const websites = {
  add: async (websiteData) => {
    return await makeRequest('/api/dashboard/websites', {
      method: 'POST',
      body: JSON.stringify(websiteData),
    });
  },
};

export const scanning = {
  // ✅ FIXED: Get individual website for startScan
  startScan: async (websiteId) => {
    const website = await makeRequest(`/api/dashboard/websites/${websiteId}`);
    return await makeRequest('/api/dashboard/scans', {
      method: 'POST',
      body: JSON.stringify({
        website_id: websiteId,
        url: website.url
      })
    });
  },
  
  // ✅ NEW: Get scan metadata for polling
  getScanMeta: async (scanId) => {
    return await makeRequest(`/api/scans/${scanId}`);
  },
  
  getScanResults: async (scanId) => {
    return await makeRequest(`/api/scans/${scanId}/results`);
  },
  
  getAIAnalysis: async (scanId) => {
    return await makeRequest('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ scan_id: scanId })
    });
  }
};
