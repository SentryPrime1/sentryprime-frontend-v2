// API Configuration
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// Helper function to make API requests
async function apiRequest(endpoint, options = {} ) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if available
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Authentication API
export const auth = {
  // Register new user
  async register(userData) {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Login user
  async login(credentials) {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.token) {
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  // Logout user
  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  // Get current user from localStorage
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Check if user is authenticated
  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
};

// Dashboard API
export const dashboard = {
  // Get dashboard statistics
  async getStats() {
    return await apiRequest('/api/dashboard/stats');
  },

  // Get user's websites
  async getWebsites() {
    return await apiRequest('/api/dashboard/websites');
  },

  // Get user's scans
  async getScans() {
    return await apiRequest('/api/dashboard/scans');
  }
};

// Website Management API
export const websites = {
  // Add new website
  async add(websiteData) {
    return await apiRequest('/api/websites', {
      method: 'POST',
      body: JSON.stringify(websiteData),
    });
  },

  // Get all websites
  async getAll() {
    return await apiRequest('/api/websites');
  },

  // Delete website
  async delete(websiteId) {
    return await apiRequest(`/api/websites/${websiteId}`, {
      method: 'DELETE',
    });
  }
};

// Scanning API
export const scanning = {
  // Start a new scan
  async startScan(websiteId, options = {}) {
    return await apiRequest('/api/scan', {
      method: 'POST',
      body: JSON.stringify({
        website_id: websiteId,
        ...options
      }),
    });
  },

  // Get scan results
  async getResults(scanId) {
    return await apiRequest(`/api/scan/${scanId}`);
  },

  // Get all scans for a website
  async getWebsiteScans(websiteId) {
    return await apiRequest(`/api/websites/${websiteId}/scans`);
  }
};

// AI Analysis API
export const ai = {
  // Get AI analysis for scan results
  async analyzeScan(scanId) {
    return await apiRequest(`/api/ai/analyze/${scanId}`, {
      method: 'POST',
    });
  }
};

// Health check
export const health = {
  async check() {
    return await apiRequest('/');
  }
};

// Export default API object
export default {
  auth,
  dashboard,
  websites,
  scanning,
  ai,
  health
};
