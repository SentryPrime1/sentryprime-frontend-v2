// Alt Text AI Frontend Service
// Handles API communication with the Alt Text AI backend

class AltTextAIService {
  constructor(baseURL = '', authToken = null) {
    this.baseURL = baseURL;
    this.authToken = authToken;
    this.apiBase = `${baseURL}/api/alt-text-ai`;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get request headers with authentication
   * @private
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Make API request with error handling
   * @private
   */
  async makeRequest(endpoint, options = {}) {
    try {
      const url = `${this.apiBase}${endpoint}`;
      const response = await fetch(url, {
        headers: this.getHeaders(),
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error(`Alt Text AI API Error (${endpoint}):`, error);
      throw error;
    }
  }

  /**
   * Create a new Alt Text AI job
   * @param {string} scanId - Scan ID
   * @param {string} websiteUrl - Website URL
   * @param {Object} options - Job options
   * @returns {Promise<Object>} Job details
   */
  async createJob(scanId, websiteUrl, options = {}) {
    const response = await this.makeRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        scan_id: scanId,
        website_url: websiteUrl,
        options,
      }),
    });

    return response.job;
  }

  /**
   * Get job status and progress
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job status
   */
  async getJobStatus(jobId) {
    const response = await this.makeRequest(`/jobs/${jobId}`);
    return response.job;
  }

  /**
   * Get job results and suggestions
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Job results
   */
  async getJobResults(jobId) {
    const response = await this.makeRequest(`/jobs/${jobId}/results`);
    return response.results;
  }

  /**
   * Cancel a running job
   * @param {string} jobId - Job ID
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelJob(jobId) {
    const response = await this.makeRequest(`/jobs/${jobId}`, {
      method: 'DELETE',
    });
    return response.result;
  }

  /**
   * List user's Alt Text AI jobs
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of jobs
   */
  async listJobs(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.status) params.append('status', filters.status);
    if (filters.scanId) params.append('scan_id', filters.scanId);

    const endpoint = `/jobs${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(endpoint);
    
    return response.jobs;
  }

  /**
   * Select an alt text suggestion
   * @param {string} jobId - Job ID
   * @param {string} suggestionId - Suggestion ID
   * @param {string} selectedSuggestion - Selected alt text
   * @param {string} userFeedback - Optional user feedback
   * @returns {Promise<Object>} Selection result
   */
  async selectSuggestion(jobId, suggestionId, selectedSuggestion, userFeedback = '') {
    const response = await this.makeRequest(`/jobs/${jobId}/suggestions/${suggestionId}/select`, {
      method: 'POST',
      body: JSON.stringify({
        selectedSuggestion,
        userFeedback,
      }),
    });

    return response.suggestion;
  }

  /**
   * Get cost and time estimate for a scan
   * @param {string} scanId - Scan ID
   * @returns {Promise<Object>} Estimate details
   */
  async getEstimate(scanId) {
    const response = await this.makeRequest(`/estimate?scan_id=${scanId}`);
    return response.estimate;
  }

  /**
   * Get service health status
   * @returns {Promise<Object>} Health status
   */
  async getHealthStatus() {
    const response = await this.makeRequest('/health');
    return response.health;
  }

  /**
   * Get API usage statistics
   * @param {Object} dateRange - Date range filter
   * @returns {Promise<Object>} Usage statistics
   */
  async getUsageStats(dateRange = {}) {
    const params = new URLSearchParams();
    
    if (dateRange.from) params.append('from_date', dateRange.from);
    if (dateRange.to) params.append('to_date', dateRange.to);

    const endpoint = `/usage${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(endpoint);
    
    return response.usage;
  }

  /**
   * Get user notifications
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Notifications and stats
   */
  async getNotifications(filters = {}) {
    const params = new URLSearchParams();
    
    if (filters.unreadOnly) params.append('unread_only', 'true');
    if (filters.type) params.append('type', filters.type);
    if (filters.limit) params.append('limit', filters.limit);

    const endpoint = `/notifications${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await this.makeRequest(endpoint);
    
    return {
      notifications: response.notifications,
      stats: response.stats,
    };
  }

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Result
   */
  async markNotificationAsRead(notificationId) {
    const response = await this.makeRequest(`/notifications/${notificationId}/read`, {
      method: 'POST',
    });
    return response;
  }

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Result
   */
  async markAllNotificationsAsRead() {
    const response = await this.makeRequest('/notifications/read-all', {
      method: 'POST',
    });
    return response;
  }

  /**
   * Poll job status until completion
   * @param {string} jobId - Job ID
   * @param {Function} onProgress - Progress callback
   * @param {number} interval - Polling interval in ms
   * @returns {Promise<Object>} Final job status
   */
  async pollJobStatus(jobId, onProgress = null, interval = 2000) {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getJobStatus(jobId);
          
          if (onProgress) {
            onProgress(job);
          }

          // Check if job is complete
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            resolve(job);
            return;
          }

          // Continue polling
          setTimeout(poll, interval);
          
        } catch (error) {
          reject(error);
        }
      };

      poll();
    });
  }

  /**
   * Create job and poll until completion
   * @param {string} scanId - Scan ID
   * @param {string} websiteUrl - Website URL
   * @param {Object} options - Job options
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Object>} Job results
   */
  async createJobAndWait(scanId, websiteUrl, options = {}, onProgress = null) {
    // Create job
    const job = await this.createJob(scanId, websiteUrl, options);
    
    // Poll until completion
    const finalJob = await this.pollJobStatus(job.jobId, onProgress);
    
    // Get results if successful
    if (finalJob.status === 'completed') {
      return await this.getJobResults(finalJob.jobId);
    }
    
    throw new Error(`Job failed with status: ${finalJob.status}`);
  }

  /**
   * Batch process multiple scans
   * @param {Array} scans - Array of scan objects
   * @param {Function} onProgress - Progress callback
   * @returns {Promise<Array>} Array of results
   */
  async batchProcessScans(scans, onProgress = null) {
    const results = [];
    
    for (let i = 0; i < scans.length; i++) {
      const scan = scans[i];
      
      try {
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: scans.length,
            scan: scan,
            status: 'processing'
          });
        }

        const result = await this.createJobAndWait(
          scan.scanId,
          scan.websiteUrl,
          scan.options || {},
          (jobProgress) => {
            if (onProgress) {
              onProgress({
                current: i + 1,
                total: scans.length,
                scan: scan,
                status: 'processing',
                jobProgress: jobProgress
              });
            }
          }
        );

        results.push({
          scan: scan,
          result: result,
          success: true
        });

      } catch (error) {
        results.push({
          scan: scan,
          error: error.message,
          success: false
        });
      }
    }

    if (onProgress) {
      onProgress({
        current: scans.length,
        total: scans.length,
        status: 'completed',
        results: results
      });
    }

    return results;
  }

  /**
   * Get job statistics for dashboard
   * @returns {Promise<Object>} Job statistics
   */
  async getJobStatistics() {
    try {
      const jobs = await this.listJobs({ limit: 100 });
      
      const stats = {
        total: jobs.length,
        completed: jobs.filter(j => j.status === 'completed').length,
        running: jobs.filter(j => j.status === 'running' || j.status === 'processing').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        totalImages: jobs.reduce((sum, j) => sum + (j.totalImages || 0), 0),
        processedImages: jobs.reduce((sum, j) => sum + (j.processedImages || 0), 0),
        recentJobs: jobs.slice(0, 5)
      };

      return stats;
    } catch (error) {
      console.error('Failed to get job statistics:', error);
      return {
        total: 0,
        completed: 0,
        running: 0,
        failed: 0,
        totalImages: 0,
        processedImages: 0,
        recentJobs: []
      };
    }
  }
}

// Export singleton instance
const altTextAIService = new AltTextAIService();

export default altTextAIService;
