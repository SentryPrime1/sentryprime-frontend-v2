import React, { useEffect, useState, useRef } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, CheckCircle, AlertTriangle, Clock } from 'lucide-react';

// Configurable knobs
const MAX_SCAN_MINUTES = 10;
const POLL_EVERY_MS = 2000;     // normal tick
const ERROR_RETRY_MS = 3000;    // on transient errors

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState(new Map());
  const [error, setError] = useState('');

  // Advanced safety/persistence
  const mountedRef = useRef(false);        // avoid setState after unmount
  const scanningRef = useRef(new Set());   // persist siteIds being scanned across renders
  const timersRef = useRef(new Map());     // siteId -> timeoutId (cleared on unmount)

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      for (const id of timersRef.current.values()) clearTimeout(id);
      timersRef.current.clear();
    };
  }, []);

  const safeSet = (fn) => mountedRef.current && fn();

  const loadWebsites = async (preserveScanning = false) => {
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      console.log('🔄 Loaded websites from backend:', items.length);
      safeSet(() => setList(items));

      // Do NOT blow away progress mid-scan unless we explicitly choose to
      if (!preserveScanning) {
        safeSet(() => {
          setScanningIds(new Set());
          setScanProgress(new Map());
          scanningRef.current = new Set();
        });
      }
    } catch (e) {
      safeSet(() => setError(e.message || 'Failed to load websites'));
    } finally {
      safeSet(() => setLoading(false));
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

  // Helpers
  const setProgress = (siteId, status, message, progress) => {
    if (!mountedRef.current) return;
    setScanProgress(prev => {
      const next = new Map(prev);
      // keep last attempts if present (purely cosmetic)
      const prevEntry = next.get(siteId);
      const attempts = prevEntry?.attempts ?? 0;
      next.set(siteId, { status, message, progress, attempts });
      return next;
    });
  };

  const schedule = (siteId, fn, ms) => {
    if (!mountedRef.current) return;
    const prev = timersRef.current.get(siteId);
    if (prev) clearTimeout(prev);
    const id = setTimeout(() => mountedRef.current && fn(), ms);
    timersRef.current.set(siteId, id);
  };

  const clearSiteTimers = (siteId) => {
    const t = timersRef.current.get(siteId);
    if (t) clearTimeout(t);
    timersRef.current.delete(siteId);
    const open = timersRef.current.get(`${siteId}__open`);
    if (open) clearTimeout(open);
    timersRef.current.delete(`${siteId}__open`);
    const cleanup = timersRef.current.get(`${siteId}__cleanup`);
    if (cleanup) clearTimeout(cleanup);
    timersRef.current.delete(`${siteId}__cleanup`);
  };

  // HYBRID: simple working UI + hardened polling
  const handleScan = async (site) => {
    console.log('🔄 Starting scan for site:', site.id);
    setError('');

    // persist scanning instantly so UI sticks
    scanningRef.current.add(site.id);
    setScanningIds(prev => new Set(prev).add(site.id));
    setProgress(site.id, 'starting', 'Starting scan...', 10);

    try {
      const scan = await scanning.startScan(site.id);
      console.log('✅ Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);

      const maxAttempts = Math.ceil((MAX_SCAN_MINUTES * 60 * 1000) / POLL_EVERY_MS);
      let attempts = 0;

      const tick = async () => {
        if (!mountedRef.current) return;
        attempts += 1;

        // cosmetic: store attempts so elapsed time reads correctly
        setScanProgress(prev => {
          const next = new Map(prev);
          const current = next.get(site.id) || {};
          next.set(site.id, { ...current, attempts });
          return next;
        });

        const elapsed = attempts * POLL_EVERY_MS;
        const m = Math.floor(elapsed / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        const pct = Math.min((attempts / maxAttempts) * 90, 90); // cap at 90% until done
        setProgress(site.id, 'scanning', `Scanning... (${m}m ${s}s)`, pct);

        try {
          const meta = await scanning.getScanMeta(scan.id);
          console.log(`📊 Scan meta (attempt ${attempts}):`, meta);

          if (meta?.status === 'done') {
            // make the bar complete, show success, auto-open, refresh list (preserve other scans)
            setProgress(site.id, 'completed', 'Scan completed successfully!', 100);

            // auto-open results shortly after success message
            const openTimer = setTimeout(() => {
              if (mountedRef.current && onViewResults) onViewResults(scan.id);
              timersRef.current.delete(`${site.id}__open`);
            }, 1500);
            timersRef.current.set(`${site.id}__open`, openTimer);

            // refresh data but keep scanning UI for any other cards alive
            const cleanupTimer = setTimeout(async () => {
              if (!mountedRef.current) return;
              await loadWebsites(true); // preserveScanning
              scanningRef.current.delete(site.id);
              setScanningIds(prev => {
                const ns = new Set(prev);
                ns.delete(site.id);
                return ns;
              });
              setScanProgress(prev => {
                const nm = new Map(prev);
                nm.delete(site.id);
                return nm;
              });
              clearSiteTimers(site.id);
              timersRef.current.delete(`${site.id}__cleanup`);
            }, 2500);
            timersRef.current.set(`${site.id}__cleanup`, cleanupTimer);

            return;
          }

          if (meta?.status === 'error') {
            throw new Error('Scan failed on backend');
          }

          if (attempts >= maxAttempts) {
            setError(`Scan timed out after ${MAX_SCAN_MINUTES} minutes. It may still be finishing on the server.`);
            setProgress(site.id, 'timeout', 'Scan timed out - may still be processing', 95);
            scanningRef.current.delete(site.id);

            const cleanupTimer = setTimeout(() => {
              if (!mountedRef.current) return;
              setScanningIds(prev => {
                const ns = new Set(prev);
                ns.delete(site.id);
                return ns;
              });
              setScanProgress(prev => {
                const nm = new Map(prev);
                nm.delete(site.id);
                return nm;
              });
              clearSiteTimers(site.id);
              timersRef.current.delete(`${site.id}__cleanup`);
            }, 5000);
            timersRef.current.set(`${site.id}__cleanup`, cleanupTimer);
            return;
          }

          // keep polling
          schedule(site.id, tick, POLL_EVERY_MS);

        } catch (e) {
          console.error('Polling error:', e);
          const msg = String(e?.message || '');
          const retryable = /502|503|429|network|fetch|timeout/i.test(msg);

          if (retryable && attempts < maxAttempts) {
            setProgress(site.id, 'retrying', `Connection issue, retrying... (${attempts}/${maxAttempts})`, Math.min((attempts / maxAttempts) * 90, 90));
            schedule(site.id, tick, ERROR_RETRY_MS);
            return;
          }

          // permanent error
          setError(msg || 'Scan failed');
          setProgress(site.id, 'error', 'Scan failed - please try again', 0);
          scanningRef.current.delete(site.id);

          const cleanupTimer = setTimeout(() => {
            if (!mountedRef.current) return;
            setScanningIds(prev => {
              const ns = new Set(prev);
              ns.delete(site.id);
              return ns;
            });
            setScanProgress(prev => {
              const nm = new Map(prev);
              nm.delete(site.id);
              return nm;
            });
            clearSiteTimers(site.id);
            timersRef.current.delete(`${site.id}__cleanup`);
          }, 5000);
          timersRef.current.set(`${site.id}__cleanup`, cleanupTimer);
        }
      };

      // kick off polling with the simple, reliable loop
      schedule(site.id, tick, POLL_EVERY_MS);

    } catch (e) {
      console.error('Failed to start scan:', e);
      setError(e.message || 'Failed to start scan');
      scanningRef.current.delete(site.id);
      setScanningIds(prev => {
        const ns = new Set(prev);
        ns.delete(site.id);
        return ns;
      });
      setScanProgress(prev => {
        const nm = new Map(prev);
        nm.delete(site.id);
        return nm;
      });
      clearSiteTimers(site.id);
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
          // hybrid: UI uses state; persistence uses ref so reloads don't kill progress
          const isScanning = scanningIds.has(site.id) || scanningRef.current.has(site.id);
          const progress = scanProgress.get(site.id);
          const canViewResults = !!site.last_scan_id && !isScanning;

          return (
            <div key={site.id} className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {isScanning && progress && (
                <div className={`mb-3 p-3 rounded-md border ${
                  progress.status === 'completed' ? 'bg-green-50 border-green-200' :
                  progress.status === 'error' ? 'bg-red-50 border-red-200' :
                  progress.status === 'timeout' ? 'bg-yellow-50 border-yellow-200' :
                  progress.status === 'retrying' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sm">
                    {(progress.status === 'starting' || progress.status === 'scanning') && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
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

                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress.status === 'completed' ? 'bg-green-600' :
                        progress.status === 'retrying' ? 'bg-orange-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${progress.progress ?? 10}%` }}
                    />
                  </div>
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
                    onClick={() => handleViewResults(site.last_scan_id)}
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
        </div>
      )}
    </div>
  );
}
