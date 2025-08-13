// API Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://sentryprime-backend-clean-production.up.railway.app';

// Helper function to get auth token
const getAuthToken = ( ) => {
  return localStorage.getItem('sentryprime_token');
};

// Helper function to make authenticated requests
const makeRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return { success: true };
    }

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Authentication API
export const auth = {
  // Register new user
  register: async (userData) => {
    const response = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      localStorage.setItem('sentryprime_token', response.token);
      localStorage.setItem('sentryprime_user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      localStorage.setItem('sentryprime_token', response.token);
      localStorage.setItem('sentryprime_user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Logout user
  logout: () => {
    localStorage.removeItem('sentryprime_token');
    localStorage.removeItem('sentryprime_user');
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!getAuthToken();
  },

  // Get current user from localStorage
  getCurrentUser: () => {
    const userStr = localStorage.getItem('sentryprime_user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Dashboard API
export const dashboard = {
  // Get dashboard statistics
  getStats: async () => {
    try {
      const response = await makeRequest('/api/dashboard/stats');
      return response.overview || {
        totalWebsites: 0,
        totalScans: 0,
        avgCompliance: 0,
        totalViolations: 0
      };
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      return {
        totalWebsites: 0,
        totalScans: 0,
        avgCompliance: 0,
        totalViolations: 0
      };
    }
  },

  // Get user websites
  getWebsites: async () => {
    try {
      const response = await makeRequest('/api/dashboard/websites');
      return response.websites || [];
    } catch (error) {
      console.error('Failed to load websites:', error);
      return [];
    }
  },

  // Get user scans
  getScans: async () => {
    try {
      const response = await makeRequest('/api/dashboard/scans');
      return response.scans || [];
    } catch (error) {
      console.error('Failed to load scans:', error);
      return [];
    }
  },
};

// Websites API
export const websites = {
  // Add new website
  add: async (websiteData) => {
    return await makeRequest('/api/dashboard/websites', {
      method: 'POST',
      body: JSON.stringify(websiteData),
    });
  },

  // Delete website
  delete: async (websiteId) => {
    return await makeRequest(`/api/websites/${websiteId}`, {
      method: 'DELETE',
    });
  },

  // Get website details
  get: async (websiteId) => {
    return await makeRequest(`/api/websites/${websiteId}`);
  },

  // Update website
  update: async (websiteId, websiteData) => {
    return await makeRequest(`/api/websites/${websiteId}`, {
      method: 'PUT',
      body: JSON.stringify(websiteData),
    });
  },
};

// Scanning API
export const scanning = {
  // Start a new scan
  startScan: async (websiteId, options = {}) => {
    try {
      // Get the website details first
      const websites = await dashboard.getWebsites();
      const website = websites.find(w => w.id === websiteId);
      
      if (!website) {
        throw new Error('Website not found');
      }

      // Start the scan using the website URL
      const response = await makeRequest('/api/dashboard/scans', {
        method: 'POST',
        body: JSON.stringify({
          website_id: websiteId,
          url: website.url,
          ...options,
        }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to start scan:', error);
      throw error;
    }
  },

  // Get scan results
  getScanResults: async (scanId) => {
    return await makeRequest(`/api/scans/${scanId}/results`);
  },

  // Get AI analysis for a URL
  getAIAnalysis: async (url) => {
    try {
      const response = await makeRequest('/api/scan/ai-enhanced', {
        method: 'POST',
        body: JSON.stringify({ url }),
      });
      
      return response;
    } catch (error) {
      console.error('Failed to get AI analysis:', error);
      throw error;
    }
  },

  // Get scan history
  getHistory: async (websiteId) => {
    return await makeRequest(`/api/websites/${websiteId}/scans`);
  },
};

// Health check API
export const health = {
  // Check backend health
  check: async () => {
    try {
      const response = await makeRequest('/');
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },
};

// Export default API object
const api = {
  auth,
  dashboard,
  websites,
  scanning,
  health,
};

export default api;
