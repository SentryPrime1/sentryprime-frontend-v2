import React, { useEffect, useState } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, Clock, CheckCircle } from 'lucide-react';

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState(new Map()); // Track scan progress
  const [error, setError] = useState('');

  const loadWebsites = async () => {
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      console.log('🔄 Loaded websites from backend:', items.map(item => ({ 
        id: item.id, 
        url: item.url, 
        last_scan_id: item.last_scan_id,
        violations: item.total_violations 
      })));
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

  // ✅ FIXED: Extended timeout and better progress tracking
  const handleScan = async (site) => {
    console.log('🔄 Starting scan for site:', { id: site.id, url: site.url });
    setError('');
    setScanningIds(prev => new Set(prev).add(site.id));
    setScanProgress(prev => new Map(prev).set(site.id, { 
      status: 'starting', 
      message: 'Initializing scan...', 
      attempts: 0 
    }));
    
    try {
      const scan = await scanning.startScan(site.id);
      console.log('✅ Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      
      // ✅ FIXED: Extended timeout from 2 minutes to 10 minutes
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes (300 * 2 seconds = 600 seconds)
      
      const pollForCompletion = async () => {
        try {
          attempts++;
          
          // Update progress UI
          setScanProgress(prev => new Map(prev).set(site.id, {
            status: 'scanning',
            message: `Scanning... (${Math.floor(attempts * 2 / 60)}m ${(attempts * 2) % 60}s)`,
            attempts
          }));
          
          const meta = await scanning.getScanMeta(scan.id);
          console.log(`🔄 Scan meta (attempt ${attempts}):`, meta);
          
          if (meta && meta.status === 'done') {
            console.log('✅ Scan completed! Reloading websites from backend...');
            
            // Update progress to completed
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'completed',
              message: 'Scan completed successfully!',
              attempts
            }));
            
            await loadWebsites(); // Backend has updated website with last_scan_id
            
            // Clean up after 2 seconds
            setTimeout(() => {
              setScanningIds(prev => {
                const next = new Set(prev);
                next.delete(site.id);
                return next;
              });
              setScanProgress(prev => {
                const next = new Map(prev);
                next.delete(site.id);
                return next;
              });
            }, 2000);
            
          } else if (meta && meta.status === 'error') {
            throw new Error('Scan failed on backend');
          } else if (attempts >= maxAttempts) {
            throw new Error('Scan timed out after 10 minutes');
          } else {
            // Still running, poll again in 2 seconds
            setTimeout(pollForCompletion, 2000);
          }
        } catch (e) {
          console.error('Polling error:', e);
          
          if (attempts >= maxAttempts || e.message.includes('timed out')) {
            setError(`Scan timed out after ${Math.floor(attempts * 2 / 60)} minutes. The scan may still be running in the background.`);
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'timeout',
              message: 'Scan timed out - may still be processing',
              attempts
            }));
          } else {
            // Continue polling on temporary errors, but show warning
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'retrying',
              message: `Connection issue, retrying... (${attempts}/${maxAttempts})`,
              attempts
            }));
            setTimeout(pollForCompletion, 3000); // Slightly longer delay on errors
          }
          
          // Clean up after timeout or max retries
          if (attempts >= maxAttempts) {
            setTimeout(() => {
              setScanningIds(prev => {
                const next = new Set(prev);
                next.delete(site.id);
                return next;
              });
              setScanProgress(prev => {
                const next = new Map(prev);
                next.delete(site.id);
                return next;
              });
            }, 5000);
          }
        }
      };
      
      pollForCompletion();
      
    } catch (e) {
      setError(e.message || 'Failed to start scan');
      setScanningIds(prev => {
        const next = new Set(prev);
        next.delete(site.id);
        return next;
      });
      setScanProgress(prev => {
        const next = new Map(prev);
        next.delete(site.id);
        return next;
      });
    }
  };

  const handleViewResults = (scanId) => {
    console.log('🔍 Viewing results for scan ID:', scanId);
    if (!scanId) {
      setError('Scan results are not ready yet. Please wait for the scan to complete.');
      return;
    }
    onViewResults && onViewResults(scanId);
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600 flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading websites…
      </div>
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
          className="flex-1 rounded-md border border-gray-300 p-2 text-sm"
          value={newWebsiteUrl}
          onChange={(e) => setNewWebsiteUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-black px-4 py-2 text-white text-sm disabled:opacity-60 flex items-center gap-2"
        >
          {adding && <Loader2 className="h-4 w-4 animate-spin" />}
          {adding ? 'Adding…' : 'Add Website'}
        </button>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((site) => {
          const isScanning = scanningIds.has(site.id);
          const progress = scanProgress.get(site.id);
          const canViewResults = !!site.last_scan_id && !isScanning;
          
          return (
            <div key={site.id} className="rounded-lg border p-4 bg-white shadow-sm">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {/* ✅ ENHANCED: Better scanning progress indicator */}
              {isScanning && progress && (
                <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="flex items-center space-x-2 text-sm">
                    {progress.status === 'starting' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress.status === 'scanning' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress.status === 'retrying' && <Clock className="h-4 w-4 text-yellow-600" />}
                    {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {progress.status === 'timeout' && <Clock className="h-4 w-4 text-red-600" />}
                    
                    <span className={`font-medium ${
                      progress.status === 'completed' ? 'text-green-700' :
                      progress.status === 'timeout' ? 'text-red-700' :
                      progress.status === 'retrying' ? 'text-yellow-700' :
                      'text-blue-700'
                    }`}>
                      {progress.message}
                    </span>
                  </div>
                  
                  {/* Progress bar for scanning */}
                  {progress.status === 'scanning' && (
                    <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min((progress.attempts / 300) * 100, 95)}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleScan(site)}
                  disabled={isScanning}
                  className={`rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                    isScanning 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isScanning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isScanning ? 'Scanning…' : 'Scan Now'}
                </button>
                
                {canViewResults && (
                  <button
                    onClick={() => {
                      console.log('🔍 Clicking View Results for scan ID:', site.last_scan_id);
                      console.log('🔍 Site data:', { 
                        id: site.id, 
                        last_scan_id: site.last_scan_id, 
                        violations: site.total_violations 
                      });
                      handleViewResults(site.last_scan_id);
                    }}
                    className="rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 border border-green-600 text-green-600 hover:bg-green-50 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    View Results
                  </button>
                )}
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                <div>Compliance: {site.compliance_score ?? 0}% • Violations: {site.total_violations ?? 0}</div>
                <div>Last Scan: {site.last_scan_date ? new Date(site.last_scan_date).toLocaleString() : 'Never'}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {list.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg font-medium mb-2">No websites added yet</div>
          <div className="text-sm">Add your first website above to start scanning for accessibility issues</div>
        </div>
      )}
    </div>
  );
}
