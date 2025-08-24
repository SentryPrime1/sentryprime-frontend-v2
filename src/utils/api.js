// FIXED src/utils/api.js - Works with original backend structure

const API_BASE = 'https://sentryprime-backend-v2-production.up.railway.app';

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
  
  // ✅ Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('sentryprime_token');
    if (!token) return false;
    
    try {
      // Basic token validation - check if it's not expired
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (e) {
      return false;
    }
  },
  
  // ✅ Get current user data
  getCurrentUser: () => {
    const token = localStorage.getItem('sentryprime_token');
    const userData = localStorage.getItem('sentryprime_user');
    
    if (!token || !userData) return null;
    
    try {
      return JSON.parse(userData);
    } catch (e) {
      return null;
    }
  },
  
  // ✅ Logout user
  logout: () => {
    localStorage.removeItem('sentryprime_token');
    localStorage.removeItem('sentryprime_user');
  },
  
  // ✅ Store auth data after login
  storeAuthData: (token, user) => {
    localStorage.setItem('sentryprime_token', token);
    localStorage.setItem('sentryprime_user', JSON.stringify(user));
  }
};

export const dashboard = {
  // ✅ FIXED: Added missing getStats function
  getStats: async () => {
    return await makeRequest('/api/dashboard/overview');
  },
  
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
  // ✅ FIXED: Updated to work with the original backend route structure
  startScan: async (websiteId, websiteUrl) => {
    return await makeRequest('/api/dashboard/scans', {
      method: 'POST',
      body: JSON.stringify({
        website_id: websiteId,
        url: websiteUrl
      })
    });
  },
  
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
export { makeRequest };

