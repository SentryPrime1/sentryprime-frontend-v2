// src/components/WebsiteManager.jsx
import React, { useEffect, useState } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader } from 'lucide-react';

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState({}); // Track progress for each scan
  const [completedScans, setCompletedScans] = useState(new Map()); // Track newly completed scans with their IDs
  const [error, setError] = useState('');

  const loadWebsites = async () => {
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      setList(items);
    } catch (e) {
      setError(e.message || 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWebsites();
  }, []);

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newWebsiteUrl.trim()) return;

    setAdding(true);
    setError('');
    try {
      await websites.add({ url: newWebsiteUrl.trim() });
      setNewWebsiteUrl('');
      await loadWebsites();
      onWebsiteAdded && onWebsiteAdded();
    } catch (e) {
      setError(e.message || 'Failed to add website');
    } finally {
      setAdding(false);
    }
  };

  const pollScanProgress = async (scanId, siteId) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    const poll = async () => {
      try {
        attempts++;
        
        // Update progress bar (simulate progress based on time)
        const progress = Math.min((attempts / maxAttempts) * 90, 90); // Max 90% until completion
        setScanProgress(prev => ({ ...prev, [siteId]: progress }));

        // Check if scan is complete by trying to get results
        const results = await scanning.getScanResults(scanId);
        
        if (results && results.violations && results.violations.length > 0) {
          // Scan completed successfully
          console.log('✅ Scan completed! Storing scan ID:', scanId, 'for site:', siteId);
          
          setScanProgress(prev => ({ ...prev, [siteId]: 100 }));
          
          // Store the completed scan ID for this site
          setCompletedScans(prev => new Map(prev).set(siteId, scanId));
          
          setScanningIds(prev => {
            const next = new Set(prev);
            next.delete(siteId);
            return next;
          });
          
          // Refresh website list to show updated data
          await loadWebsites();
          return;
        }
        
        // Continue polling if not complete and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          // Timeout
          setScanProgress(prev => {
            const next = { ...prev };
            delete next[siteId];
            return next;
          });
          setScanningIds(prev => {
            const next = new Set(prev);
            next.delete(siteId);
            return next;
          });
          setError('Scan timed out. Please try again.');
        }
      } catch (e) {
        // Scan still in progress, continue polling
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setScanProgress(prev => {
            const next = { ...prev };
            delete next[siteId];
            return next;
          });
          setScanningIds(prev => {
            const next = new Set(prev);
            next.delete(siteId);
            return next;
          });
        }
      }
    };
    
    poll();
  };

  const handleScan = async (site) => {
    setError('');
    setScanningIds(prev => new Set(prev).add(site.id));
    setScanProgress(prev => ({ ...prev, [site.id]: 0 }));
    
    // Clear any previous completion status for this site
    setCompletedScans(prev => {
      const next = new Map(prev);
      next.delete(site.id);
      return next;
    });
    
    try {
      const scan = await scanning.startScan(site.id);
      console.log('Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      
      // Start polling for progress
      pollScanProgress(scan.id, site.id);
      
    } catch (e) {
      setError(e.message || 'Failed to start scan');
      setScanningIds(prev => {
        const next = new Set(prev);
        next.delete(site.id);
        return next;
      });
      setScanProgress(prev => {
        const next = { ...prev };
        delete next[site.id];
        return next;
      });
    }
  };

  const handleViewResults = (scanId) => {
    console.log('🔍 handleViewResults called with scanId:', scanId);
    
    // Clear completion status after viewing
    setCompletedScans(prev => {
      const next = new Map(prev);
      // Remove any entries that have this scanId as value
      for (const [siteId, storedScanId] of next.entries()) {
        if (storedScanId === scanId) {
          next.delete(siteId);
          break;
        }
      }
      return next;
    });
    
    onViewResults && onViewResults(scanId);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">Loading websites…</div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleAddWebsite} className="flex gap-2">
        <input
          type="url"
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-border p-2"
          value={newWebsiteUrl}
          onChange={(e) => setNewWebsiteUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {adding ? 'Adding…' : 'Add Website'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((site) => {
          const isScanning = scanningIds.has(site.id);
          const progress = scanProgress[site.id] || 0;
          const isNewlyCompleted = completedScans.has(site.id);
          
          // ✅ FIXED: More permissive button visibility logic
          // Show button if site has violations OR a scan ID OR is newly completed
          const hasResults = (site.total_violations && site.total_violations > 0) || 
                           site.last_scan_id || 
                           isNewlyCompleted;
          
          // Get the best available scan ID for the button
          const scanIdToUse = completedScans.get(site.id) || site.last_scan_id;
          
          return (
            <div key={site.id} className="rounded-lg border p-4">
              <div className="mb-2 font-medium">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600">{site.url}</div>

              {/* Progress Bar */}
              {isScanning && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Scanning in progress...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleScan(site)}
                  disabled={isScanning}
                  className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60 flex items-center gap-2"
                >
                  {isScanning && <Loader className="h-4 w-4 animate-spin" />}
                  {isScanning ? 'Scanning…' : 'Scan Now'}
                </button>
                
                {/* ✅ FIXED: Show button if there are results, even without perfect scan ID */}
                {hasResults && !isScanning && (
                  <button
                    onClick={() => {
                      // Use the best available scan ID, or create a fallback
                      const idToUse = scanIdToUse || `fallback-${site.id}`;
                      console.log('🔍 Clicking View Results for scan ID:', idToUse);
                      console.log('🔍 Site ID:', site.id);
                      console.log('🔍 Site last_scan_id:', site.last_scan_id);
                      console.log('🔍 Site violations:', site.total_violations);
                      console.log('🔍 Completed scan ID:', completedScans.get(site.id));
                      handleViewResults(idToUse);
                    }}
                    className={`rounded-md px-3 py-2 flex items-center gap-2 ${
                      isNewlyCompleted 
                        ? 'bg-green-600 text-white hover:bg-green-700 animate-pulse' 
                        : 'border border-green-600 text-green-600 hover:bg-green-50'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    {isNewlyCompleted ? 'View Results ✨' : 'View Results'}
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500">
                Compliance: {site.compliance_score ?? 0}% • Violations: {site.total_violations ?? 0} • Last Scan:{' '}
                {site.last_scan_date ? new Date(site.last_scan_date).toLocaleString() : 'Never'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
