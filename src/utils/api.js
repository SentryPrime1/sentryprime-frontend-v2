// Base API configuration
const API_BASE = 'https://sentryprime-backend-v2-production.up.railway.app';

// Enhanced request function with better error handling
export const makeRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token') || localStorage.getItem('sentryprime_token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }

  const config = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    ...options,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) return {};
    
    return JSON.parse(text);
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
};

// Authentication API
export const auth = {
  login: async (credentials) => {
    return await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData) => {
    return await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('sentryprime_token');
    window.location.href = '/login';
  },
};

// Dashboard API
export const dashboard = {
  getOverview: async () => {
    return await makeRequest('/api/dashboard/overview');
  },

  getWebsites: async () => {
    const response = await makeRequest('/api/dashboard/websites');
    // ✅ FIXED: Backend returns array directly, not wrapped in object
    return response || [];
  },

  getScans: async () => {
    const response = await makeRequest('/api/dashboard/scans');
    return response.scans || [];
  },

  addWebsite: async (websiteData) => {
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
  
  // ✅ FIXED: Changed from /api/scans/:id/results to /api/scans/:id
  getScanResults: async (scanId) => {
    return await makeRequest(`/api/scans/${scanId}`);
  },
  
  getAIAnalysis: async (scanId) => {
    return await makeRequest('/api/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({ scan_id: scanId })
    });
  }
};

export { makeRequest };
