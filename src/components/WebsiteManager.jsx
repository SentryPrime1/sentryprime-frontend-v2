// src/components/WebsiteManager.jsx
import React, { useEffect, useState } from 'react';
import { dashboard, websites, scanning } from '../utils/api';

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

  const handleScan = async (site) => {
    setError('');
    setScanningIds(prev => new Set(prev).add(site.id));
    try {
      const scan = await scanning.startScan(site.id);
      console.log('Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      // Refresh the website list to show updated scan info
      await loadWebsites();
    } catch (e) {
      setError(e.message || 'Failed to start scan');
    } finally {
      setScanningIds(prev => {
        const next = new Set(prev);
        next.delete(site.id);
        return next;
      });
    }
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
          onChange={(e ) => setNewWebsiteUrl(e.target.value)}
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
        {list.map((site) => (
          <div key={site.id} className="rounded-lg border p-4">
            <div className="mb-2 font-medium">{site.name || site.url}</div>
            <div className="mb-3 text-sm text-gray-600">{site.url}</div>

            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => handleScan(site)}
                disabled={scanningIds.has(site.id)}
                className="rounded-md bg-blue-600 px-3 py-2 text-white disabled:opacity-60"
              >
                {scanningIds.has(site.id) ? 'Scanning…' : 'Scan Now'}
              </button>
              
              {/* ✅ NEW: View Results button */}
              {site.last_scan_id && (
                <button
                  onClick={() => onViewResults && onViewResults(site.last_scan_id)}
                  className="rounded-md border border-green-600 text-green-600 px-3 py-2 hover:bg-green-50"
                >
                  View Results
                </button>
              )}
            </div>

            <div className="text-xs text-gray-500">
              Compliance: {site.compliance_score ?? 0}% • Violations: {site.total_violations ?? 0} • Last Scan:{' '}
              {site.last_scan_date ? new Date(site.last_scan_date).toLocaleString() : 'Never'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
