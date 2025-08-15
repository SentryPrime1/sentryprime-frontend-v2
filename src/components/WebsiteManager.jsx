import React, { useState } from 'react';
import { 
  Globe, 
  Plus, 
  Scan, 
  Eye, 
  Brain,
  Loader,
  Calendar,
  BarChart3
} from 'lucide-react';
import { websites, scanning } from '../utils/api';

function WebsiteManager({ 
  websites: userWebsites, 
  onWebsiteAdded, 
  onScanStarted, 
  onViewScan, 
  onViewAIAnalysis 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [addingWebsite, setAddingWebsite] = useState(false);
  const [scanningWebsites, setScanningWebsites] = useState(new Set());

  const handleStartScan = async (website) => {
    setScanningWebsites(prev => new Set(prev).add(website.id));
    try {
      const scanResult = await scanning.startScan(website.id, {
        // you can add options like { maxPages: 10 } if your backend supports them
      });

      console.log('Scan created with ID:', scanResult.id);
      // Tell the parent (Dashboard) to reload stats/websites/scans
      if (typeof onScanStarted === 'function') onScanStarted();

      // Optional: show quick confirmation
      alert(`Scan started successfully! Scan ID: ${scanResult.id}`);
    } catch (err) {
      console.error('Scan start error:', err);
      alert('Failed to start scan: ' + err.message);
    } finally {
      setScanningWebsites(prev => {
        const s = new Set(prev);
        s.delete(website.id);
        return s;
      });
    }
  };

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newWebsiteUrl.trim()) return;

    setAddingWebsite(true);
    try {
      await websites.addWebsite(newWebsiteUrl.trim());
      setNewWebsiteUrl('');
      setShowAddForm(false);
      onWebsiteAdded();
    } catch (err) {
      alert('Failed to add website: ' + err.message);
    } finally {
      setAddingWebsite(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
                <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL
                </label>
                <input
                  type="url"
                  id="website-url"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="input-field"
                  required
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={addingWebsite}
                  className="btn-primary flex items-center space-x-2"
                >
                  {addingWebsite ? (
                    <Loader className="h-4 w-4 animate-spin" />
                   ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span>{addingWebsite ? 'Adding...' : 'Add Website'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewWebsiteUrl('');
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Websites List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Your Websites</h3>
        </div>
        <div className="card-content">
          {userWebsites.length > 0 ? (
            <div className="space-y-4">
              {userWebsites.map((website) => (
                <div key={website.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <div>
                        <h4 className="font-medium text-gray-900">{website.name || website.url}</h4>
                        <p className="text-sm text-gray-500">{website.url}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {website.last_scan_date && (
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>Last scan: {new Date(website.last_scan_date).toLocaleDateString()}</span>
                          </div>
                          {website.compliance_score !== null && (
                            <div className="flex items-center space-x-1 mt-1">
                              <BarChart3 className="h-3 w-3" />
                              <span className={`font-medium ${
                                website.compliance_score >= 80 ? 'text-green-600' : 
                                website.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                              }`}>
                                {website.compliance_score}% compliant
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStartScan(website)}
                          disabled={scanningWebsites.has(website.id)}
                          className="btn-primary text-sm flex items-center space-x-1"
                        >
                          {scanningWebsites.has(website.id) ? (
                            <Loader className="h-3 w-3 animate-spin" />
                          ) : (
                            <Scan className="h-3 w-3" />
                          )}
                          <span>{scanningWebsites.has(website.id) ? 'Scanning...' : 'Scan Now'}</span>
                        </button>
                        
                        {website.last_scan_date && (
                          <>
                            <button
                              onClick={() => onViewScan(website)}
                              className="btn-outline text-sm flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Results</span>
                            </button>
                            
                            <button
                              onClick={() => onViewAIAnalysis(website)}
                              className="btn-outline text-sm flex items-center space-x-1"
                            >
                              <Brain className="h-3 w-3" />
                              <span>AI Analysis</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No websites added yet</h3>
              <p className="text-gray-600 mb-4">
                Add your first website to start monitoring accessibility compliance
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Website</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default WebsiteManager;
