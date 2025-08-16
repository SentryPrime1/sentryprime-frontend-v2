// STEP 3: Replace your src/components/WebsiteManager.jsx with this simplified version

import React, { useEffect, useState } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2 } from 'lucide-react';

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
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

  // ✅ SIMPLIFIED: Poll for completion with timeout safeguard
  const handleScan = async (site) => {
    console.log('🔄 Starting scan for site:', { id: site.id, url: site.url });
    setError('');
    setScanningIds(prev => new Set(prev).add(site.id));
    
    try {
      const scan = await scanning.startScan(site.id);
      console.log('✅ Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      
      // ✅ FIX: Poll with timeout safeguard
      let attempts = 0;
      const maxAttempts = 60; // 2 minutes max
      
      const pollForCompletion = async () => {
        try {
          attempts++;
          const meta = await scanning.getScanMeta(scan.id);
          console.log('🔄 Scan meta (attempt', attempts + '):', meta);
          
          if (meta && meta.status === 'done') {
            console.log('✅ Scan completed! Reloading websites from backend...');
            await loadWebsites(); // Backend has updated website with last_scan_id
            setScanningIds(prev => {
              const next = new Set(prev);
              next.delete(site.id);
              return next;
            });
          } else if (meta && meta.status === 'error') {
            throw new Error('Scan failed');
          } else if (attempts >= maxAttempts) {
            throw new Error('Scan timed out after 2 minutes');
          } else {
            // Still running, poll again
            setTimeout(pollForCompletion, 2000);
          }
        } catch (e) {
          console.error('Polling error:', e);
          if (attempts >= maxAttempts) {
            setError('Scan timed out. Please refresh and try again.');
            setScanningIds(prev => {
              const next = new Set(prev);
              next.delete(site.id);
              return next;
            });
          } else {
            // Continue polling on temporary errors
            setTimeout(pollForCompletion, 2000);
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
    }
  };

  // ✅ SIMPLIFIED: Only handle real scan IDs from backend
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
          className="flex-1 rounded-md border border-gray-300 p-2"
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
          
          // ✅ SIMPLIFIED: Only show button if backend provides real scan ID
          const canViewResults = !!site.last_scan_id && !isScanning;
          
          return (
            <div key={site.id} className="rounded-lg border p-4">
              <div className="mb-2 font-medium">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600">{site.url}</div>

              {/* Scanning indicator */}
              {isScanning && (
                <div className="mb-3">
                  <div className="flex items-center space-x-2 text-sm text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Scanning in progress...</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleScan(site)}
                  disabled={isScanning}
                  className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60 flex items-center gap-2"
                >
                  {isScanning && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isScanning ? 'Scanning…' : 'Scan Now'}
                </button>
                
                {/* ✅ SIMPLIFIED: Only show if backend provides real scan ID */}
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
                    className="rounded-md px-3 py-2 flex items-center gap-2 border border-green-600 text-green-600 hover:bg-green-50"
                  >
                    <Eye className="h-4 w-4" />
                    View Results
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
