import React, { useEffect, useState, useRef } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const MAX_SCAN_MINUTES = 10;
const POLL_EVERY_MS = 2000;

// --- helpers: stable keys + session persistence ---
const keyOf = (id) => String(id);

const activeScansStore = {
  read() {
    try { return JSON.parse(sessionStorage.getItem('activeScans') || '{}'); }
    catch { return {}; }
  },
  write(data) {
    sessionStorage.setItem('activeScans', JSON.stringify(data));
  },
  set(websiteId, payload) {
    const data = this.read();
    data[keyOf(websiteId)] = payload;
    this.write(data);
  },
  delete(websiteId) {
    const data = this.read();
    delete data[keyOf(websiteId)];
    this.write(data);
  },
};

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());    // Set<string>
  const [scanProgress, setScanProgress] = useState(new Map());  // Map<string, {status,message,progress}>
  const [error, setError] = useState('');

  const mountedRef = useRef(false);
  const timersRef = useRef(new Map()); // Map<string, number>

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // clear all pending timeouts on unmount
      for (const t of timersRef.current.values()) clearTimeout(t);
      timersRef.current.clear();
    };
  }, []);

  const safeSet = (fn) => { if (mountedRef.current) fn(); };

  const loadWebsites = async () => {
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      safeSet(() => setList(items));
    } catch (e) {
      safeSet(() => setError(e.message || 'Failed to load websites'));
    } finally {
      safeSet(() => setLoading(false));
    }
  };

  // Resume any scans persisted in sessionStorage
  const resumeActiveScans = () => {
    const store = activeScansStore.read();
    const ids = Object.keys(store);
    if (!ids.length) return;
    // mark all as scanning and kick off polling for each
    safeSet(() => setScanningIds(new Set(ids)));
    for (const websiteId of ids) {
      const { scanId, startedAt } = store[websiteId] || {};
      if (!scanId) continue;
      // show a baseline progress bar immediately
      safeSet(() => {
        setScanProgress(prev => {
          const m = new Map(prev);
          if (!m.get(websiteId)) {
            m.set(websiteId, { status: 'scanning', message: 'Resuming…', progress: 12 });
          }
          return m;
        });
      });
      poll(websiteId, scanId, startedAt || Date.now());
    }
  };

  useEffect(() => {
    (async () => {
      await loadWebsites();
      resumeActiveScans();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // --- polling loop bound to (websiteId, scanId) ---
  const poll = (websiteId, scanId, startedAt = Date.now(), attempt = 0) => {
    if (!mountedRef.current) return;

    const maxAttempts = Math.ceil((MAX_SCAN_MINUTES * 60 * 1000) / POLL_EVERY_MS);

    const tick = async () => {
      if (!mountedRef.current) return;
      const nextAttempt = attempt + 1;

      // optimistic progress (kept visible across renders)
      const elapsed = Date.now() - startedAt;
      const m = Math.floor(elapsed / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      const pct = Math.min((nextAttempt / maxAttempts) * 94, 94);

      safeSet(() => {
        setScanProgress(prev => {
          const map = new Map(prev);
          map.set(websiteId, { status: 'scanning', message: `Scanning… (${m}m ${s}s)`, progress: pct });
          return map;
        });
      });

      try {
        const meta = await scanning.getScanMeta(scanId);

        if (meta?.status === 'done') {
          // show completion
          safeSet(() => {
            setScanProgress(prev => {
              const map = new Map(prev);
              map.set(websiteId, { status: 'completed', message: 'Scan completed!', progress: 100 });
              return map;
            });
          });

          // show results + refresh sites, then clean UI state
          setTimeout(async () => {
            if (!mountedRef.current) return;
            onViewResults && onViewResults(scanId);
            await loadWebsites();
            activeScansStore.delete(websiteId);
            safeSet(() => {
              setScanningIds(prev => { const s = new Set(prev); s.delete(websiteId); return s; });
              setScanProgress(prev => { const m2 = new Map(prev); m2.delete(websiteId); return m2; });
            });
          }, 1200);
          return;
        }

        if (meta?.status === 'error') {
          throw new Error('Scan failed on backend');
        }

        if (nextAttempt >= maxAttempts) {
          safeSet(() => {
            setError(`Scan timed out after ${MAX_SCAN_MINUTES} minutes. It may still be running.`);
            setScanProgress(prev => {
              const map = new Map(prev);
              map.set(websiteId, { status: 'timeout', message: 'Timed out — may still be processing', progress: 95 });
              return map;
            });
            setScanningIds(prev => { const s = new Set(prev); s.delete(websiteId); return s; });
          });
          activeScansStore.delete(websiteId);
          return;
        }

        // schedule the next tick
        const t = setTimeout(() => poll(websiteId, scanId, startedAt, nextAttempt), POLL_EVERY_MS);
        timersRef.current.set(websiteId, t);

      } catch (e) {
        const retryable = /502|503|429|network|fetch|timeout/i.test(String(e?.message || ''));
        if (retryable && attempt < maxAttempts) {
          // brief retry with same attempt count (keeps progress steady)
          const t = setTimeout(() => poll(websiteId, scanId, startedAt, nextAttempt), 3000);
          timersRef.current.set(websiteId, t);
          safeSet(() => {
            setScanProgress(prev => {
              const map = new Map(prev);
              const cur = map.get(websiteId) || { progress: 12 };
              map.set(websiteId, { status: 'retrying', message: 'Temporary issue, retrying…', progress: cur.progress });
              return map;
            });
          });
          return;
        }
        // permanent error
        safeSet(() => {
          setError(e?.message || 'Scan failed');
          setScanProgress(prev => {
            const map = new Map(prev);
            map.set(websiteId, { status: 'error', message: 'Scan failed — please try again', progress: 0 });
            return map;
          });
          setScanningIds(prev => { const s = new Set(prev); s.delete(websiteId); return s; });
        });
        activeScansStore.delete(websiteId);
      }
    };

    tick();
  };

  const handleScan = async (site) => {
    const websiteId = keyOf(site.id);
    setError('');

    // lock UI immediately
    safeSet(() => {
      setScanningIds(prev => { const s = new Set(prev); s.add(websiteId); return s; });
      setScanProgress(prev => {
        const m = new Map(prev);
        m.set(websiteId, { status: 'starting', message: 'Starting…', progress: 10 });
        return m;
      });
    });

    try {
      const scan = await scanning.startScan(site.id);
      // persist so we can survive remounts
      activeScansStore.set(websiteId, { scanId: scan.id, startedAt: Date.now() });

      // ⚠️ If your parent remounts this component when this fires,
      // our sessionStorage + resumeActiveScans will keep the UI/polling alive.
      onScanStarted && onScanStarted(scan);

      // start polling now
      poll(websiteId, scan.id, Date.now(), 0);
    } catch (e) {
      setError(e.message || 'Failed to start scan');
      // revert UI lock
      safeSet(() => {
        setScanningIds(prev => { const s = new Set(prev); s.delete(websiteId); return s; });
        setScanProgress(prev => { const m = new Map(prev); m.delete(websiteId); return m; });
      });
      activeScansStore.delete(websiteId);
    }
  };

  const handleViewResults = (scanId) => {
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
          const id = keyOf(site.id);
          const isScanning = scanningIds.has(id);
          const progress = scanProgress.get(id) || (isScanning ? { status: 'scanning', message: 'Scanning…', progress: 12 } : null);
          const canViewResults = !!site.last_scan_id && !isScanning;

          return (
            <div key={id} className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {isScanning && (
                <div className={`mb-3 p-3 rounded-md border ${
                  progress?.status === 'completed' ? 'bg-green-50 border-green-200' :
                  progress?.status === 'error' ? 'bg-red-50 border-red-200' :
                  progress?.status === 'timeout' ? 'bg-yellow-50 border-yellow-200' :
                  progress?.status === 'retrying' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sm">
                    {(progress?.status === 'starting' || progress?.status === 'scanning') &&
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress?.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {progress?.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    <span className="font-medium">
                      {progress?.message}
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress?.status === 'completed' ? 'bg-green-600' :
                        progress?.status === 'retrying' ? 'bg-orange-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${progress?.progress ?? 12}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleScan(site)}
                  disabled={isScanning}
                  className={`rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                    isScanning ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
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
