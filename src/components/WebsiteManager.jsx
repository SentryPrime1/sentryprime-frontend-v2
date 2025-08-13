import React, { useState } from 'react';
import { 
  Plus, 
  Globe, 
  Scan, 
  Trash2, 
  ExternalLink, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Brain,
  Calendar,
  BarChart3
} from 'lucide-react';
import { websites, scanning } from '../utils/api';

function WebsiteManager({ 
  websites: websiteList, 
  onWebsiteAdded, 
  onScanStarted, 
  onViewScan, 
  onViewAIAnalysis 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanningWebsites, setScanningWebsites] = useState(new Set());
  const [formData, setFormData] = useState({
    url: '',
    name: ''
  });
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate URL
      let url = formData.url.trim();
      if (!url.startsWith('http://' ) && !url.startsWith('https://' )) {
        url = 'https://' + url;
      }

      await websites.add({
        url: url,
        name: formData.name.trim( ) || null
      });

      // Reset form
      setFormData({ url: '', name: '' });
      setShowAddForm(false);
      onWebsiteAdded();
    } catch (err) {
      setError(err.message || 'Failed to add website');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebsite = async (websiteId) => {
    if (!confirm('Are you sure you want to delete this website?')) {
      return;
    }

    try {
      await websites.delete(websiteId);
      onWebsiteAdded(); // Refresh the list
    } catch (err) {
      alert('Failed to delete website: ' + err.message);
    }
  };

  const handleStartScan = async (website) => {
    setScanningWebsites(prev => new Set(prev).add(website.id));
    
    try {
      const scanResult = await scanning.startScan(website.id, {
        maxPages: 10 // Limit to 10 pages for demo
      });
      
      onScanStarted();
      
      // Show success message
      alert(`Scan started successfully! Scan ID: ${scanResult.scan_id}`);
    } catch (err) {
      alert('Failed to start scan: ' + err.message);
    } finally {
      setScanningWebsites(prev => {
        const newSet = new Set(prev);
        newSet.delete(website.id);
        return newSet;
      });
    }
  };

  const getComplianceColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getComplianceIcon = (score) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return Clock;
    return AlertTriangle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Website Management</h2>
          <p className="text-gray-600 mt-1">Add websites and run accessibility scans</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* Add Website Form */}
      {showAddForm && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">Add New Website</h3>
          </div>
          <div className="card-content">
            <form onSubmit={handleAddWebsite} className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL *
                </label>
                <input
                  id="url"
                  name="url"
                  type="url"
                  required
                  className="input"
                  placeholder="https://example.com"
                  value={formData.url}
                  onChange={handleInputChange}
                />
              </div>
              
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Website Name (optional )
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="input"
                  placeholder="My Company Website"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Adding...
                    </div>
                  ) : (
                    'Add Website'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setError('');
                    setFormData({ url: '', name: '' });
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Websites List */}
      <div className="space-y-4">
        {websiteList.length > 0 ? (
          websiteList.map((website) => {
            const isScanning = scanningWebsites.has(website.id);
            const ComplianceIcon = website.compliance_score !== null 
              ? getComplianceIcon(website.compliance_score) 
              : Clock;

            return (
              <div key={website.id} className="card">
                <div className="card-content">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <Globe className="h-8 w-8 text-gray-400" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {website.name || website.url}
                          </h3>
                          <a
                            href={website.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                        
                        <p className="text-sm text-gray-500 truncate">{website.url}</p>
                        
                        {website.last_scan_date && (
                          <p className="text-xs text-gray-400 mt-1">
                            Last scanned: {new Date(website.last_scan_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Compliance Score */}
                      {website.compliance_score !== null ? (
                        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${getComplianceColor(website.compliance_score)}`}>
                          <ComplianceIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">{website.compliance_score}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Not scanned</span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleStartScan(website)}
                          disabled={isScanning}
                          className="btn-primary flex items-center space-x-2"
                        >
                          {isScanning ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Scanning...</span>
                            </>
                          ) : (
                            <>
                              <Scan className="h-4 w-4" />
                              <span>Scan Now</span>
                            </>
                          )}
                        </button>

                        {website.compliance_score !== null && (
                          <>
                            <button
                              onClick={() => onViewScan(website)}
                              className="btn-outline flex items-center space-x-2"
                            >
                              <BarChart3 className="h-4 w-4" />
                              <span>View Results</span>
                            </button>
                            
                            <button
                              onClick={() => onViewAIAnalysis(website)}
                              className="btn-outline flex items-center space-x-2 text-purple-600 border-purple-200 hover:bg-purple-50"
                            >
                              <Brain className="h-4 w-4" />
                              <span>AI Analysis</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDeleteWebsite(website.id)}
                          className="btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Violations Summary */}
                  {website.total_violations !== null && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          Total Issues: <span className="font-medium text-gray-900">{website.total_violations}</span>
                        </span>
                        <span className="text-gray-600">
                          Compliance: <span className={`font-medium ${website.compliance_score >= 80 ? 'text-green-600' : website.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {website.compliance_score}%
                          </span>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="card">
            <div className="card-content">
              <div className="text-center py-12">
                <Globe className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No websites added yet</h3>
                <p className="text-gray-600 mb-6">
                  Add your first website to start scanning for accessibility issues
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="btn-primary flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Your First Website</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WebsiteManager;
