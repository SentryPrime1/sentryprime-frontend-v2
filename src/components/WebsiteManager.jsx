import React, { useEffect, useState, useRef } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

// ✅ CONFIGURABLE: Easy to tune for different site sizes
const MAX_SCAN_MINUTES = 10;
const POLL_EVERY_MS = 2000;
const ERROR_RETRY_MS = 3000;

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState(new Map());
  const [error, setError] = useState('');

  // ✅ PRODUCTION-READY: Timer cleanup to prevent memory leaks
  const timersRef = useRef(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Clean up all timers on unmount/navigation
      for (const id of timersRef.current.values()) {
        clearTimeout(id);
      }
      timersRef.current.clear();
    };
  }, []);

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

  // ✅ ENTERPRISE-GRADE: Robust scan handling with timer cleanup
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
      
      const maxAttempts = Math.ceil((MAX_SCAN_MINUTES * 60 * 1000) / POLL_EVERY_MS);
      let attempts = 0;
      
      // ✅ PRODUCTION-READY: Safe timer scheduling with cleanup
      const schedule = (ms) => {
        if (!mountedRef.current) return;
        const id = setTimeout(() => {
          if (!mountedRef.current) return;
          pollForCompletion();
        }, ms);
        timersRef.current.set(site.id, id);
      };

      const clearSiteTimer = () => {
        const id = timersRef.current.get(site.id);
        if (id) {
          clearTimeout(id);
          timersRef.current.delete(site.id);
        }
      };

      const cleanupScan = (delay = 2000) => {
        setTimeout(() => {
          if (!mountedRef.current) return;
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
          clearSiteTimer();
        }, delay);
      };
      
      const pollForCompletion = async () => {
        try {
          attempts++;
          
          // Update progress UI with elapsed time
          const elapsedMinutes = Math.floor(attempts * POLL_EVERY_MS / 60000);
          const elapsedSeconds = Math.floor((attempts * POLL_EVERY_MS % 60000) / 1000);
          
          setScanProgress(prev => new Map(prev).set(site.id, {
            status: 'scanning',
            message: `Scanning... (${elapsedMinutes}m ${elapsedSeconds}s)`,
            attempts,
            progress: Math.min((attempts / maxAttempts) * 95, 95) // Cap at 95% until completion
          }));
          
          const meta = await scanning.getScanMeta(scan.id);
          console.log(`🔄 Scan meta (attempt ${attempts}):`, meta);
          
          if (meta && meta.status === 'done') {
            console.log('✅ Scan completed! Reloading websites from backend...');
            
            // ✅ UX POLISH: Progress bar reaches 100% for satisfaction
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'completed',
              message: 'Scan completed successfully!',
              attempts,
              progress: 100
            }));
            
            clearSiteTimer();
            
            // ✅ DELIGHTFUL: Auto-open results on completion
            if (onViewResults) {
              setTimeout(() => {
                if (mountedRef.current) {
                  onViewResults(scan.id);
                }
              }, 1000); // Small delay for user to see completion
            }
            
            await loadWebsites(); // Backend has updated website with last_scan_id
            cleanupScan();
            
          } else if (meta && meta.status === 'error') {
            throw new Error('Scan failed on backend');
          } else if (attempts >= maxAttempts) {
            throw new Error(`Scan timed out after ${MAX_SCAN_MINUTES} minutes`);
          } else {
            // Still running, schedule next poll
            schedule(POLL_EVERY_MS);
          }
        } catch (e) {
          console.error('Polling error:', e);
          
          // ✅ ENTERPRISE-GRADE: Handle transient HTTP errors gracefully
          const errorMessage = String(e?.message || '');
          const isRetryableError = /502|503|429|network|fetch|timeout/i.test(errorMessage);
          
          if (isRetryableError && attempts < maxAttempts) {
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'retrying',
              message: `Temporary issue, retrying... (${attempts}/${maxAttempts})`,
              attempts,
              progress: Math.min((attempts / maxAttempts) * 95, 95)
            }));
            schedule(ERROR_RETRY_MS); // Longer delay for retries
            return;
          }
          
          // Permanent error or max attempts reached
          if (attempts >= maxAttempts) {
            setError(`Scan timed out after ${Math.floor(attempts * POLL_EVERY_MS / 60000)} minutes. The scan may still be running in the background.`);
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'timeout',
              message: 'Scan timed out - may still be processing',
              attempts,
              progress: 95
            }));
          } else {
            setError(errorMessage || 'Scan failed');
            setScanProgress(prev => new Map(prev).set(site.id, {
              status: 'error',
              message: 'Scan failed - please try again',
              attempts,
              progress: 0
            }));
          }
          
          clearSiteTimer();
          cleanupScan(5000); // Longer delay for errors
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
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleAddWebsite} className="flex gap-2">
        <input
          type="url"
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={newWebsiteUrl}
          onChange={(e) => setNewWebsiteUrl(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={adding}
          className="rounded-md bg-black px-4 py-2 text-white text-sm disabled:opacity-60 flex items-center gap-2 hover:bg-gray-800 transition-colors"
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
            <div key={site.id} className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {/* ✅ ENHANCED: Beautiful scanning progress indicator */}
              {isScanning && progress && (
                <div className={`mb-3 p-3 rounded-md border ${
                  progress.status === 'completed' ? 'bg-green-50 border-green-200' :
                  progress.status === 'error' ? 'bg-red-50 border-red-200' :
                  progress.status === 'timeout' ? 'bg-yellow-50 border-yellow-200' :
                  progress.status === 'retrying' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sm">
                    {progress.status === 'starting' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress.status === 'scanning' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress.status === 'retrying' && <Clock className="h-4 w-4 text-orange-600" />}
                    {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {progress.status === 'timeout' && <Clock className="h-4 w-4 text-yellow-600" />}
                    {progress.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    
                    <span className={`font-medium ${
                      progress.status === 'completed' ? 'text-green-700' :
                      progress.status === 'error' ? 'text-red-700' :
                      progress.status === 'timeout' ? 'text-yellow-700' :
                      progress.status === 'retrying' ? 'text-orange-700' :
                      'text-blue-700'
                    }`}>
                      {progress.message}
                    </span>
                  </div>
                  
                  {/* ✅ UX POLISH: Progress bar that reaches 100% on completion */}
                  {(progress.status === 'scanning' || progress.status === 'retrying' || progress.status === 'completed') && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          progress.status === 'completed' ? 'bg-green-600' :
                          progress.status === 'retrying' ? 'bg-orange-600' :
                          'bg-blue-600'
                        }`}
                        style={{ width: `${progress.progress || 0}%` }}
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
                <div className="flex items-center gap-4">
                  <span>Compliance: {site.compliance_score ?? 0}%</span>
                  <span>Violations: {site.total_violations ?? 0}</span>
                </div>
                <div>Last Scan: {site.last_scan_date ? new Date(site.last_scan_date).toLocaleString() : 'Never'}</div>
              </div>
            </div>
          );
        })}
      </div>
      
      {list.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-lg font-medium mb-2">No websites added yet</div>
          <div className="text-sm">Add your first website above to start scanning for accessibility issues</div>
          <div className="text-xs mt-2 text-gray-400">
            Scans typically take {MAX_SCAN_MINUTES} minutes or less depending on site size
          </div>
        </div>
      )}
    </div>
  );
}
