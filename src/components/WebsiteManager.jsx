import React, { useEffect, useState, useRef } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const MAX_SCAN_MINUTES = 10;
const POLL_EVERY_MS = 2000;

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState(new Map());
  const [error, setError] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0); // Force re-renders

  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadWebsites = async () => {
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      console.log('🔄 Loaded websites from backend:', items.length);
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

  // ✅ BULLETPROOF: Immediate UI feedback with forced updates
  const handleScan = async (site) => {
    console.log('🔄 STARTING SCAN - Setting UI state immediately');
    
    // ✅ IMMEDIATE: Set scanning state synchronously
    setScanningIds(prev => {
      const newSet = new Set(prev);
      newSet.add(site.id);
      console.log('✅ Added to scanningIds:', site.id, 'Set size:', newSet.size);
      return newSet;
    });
    
    setScanProgress(prev => {
      const newMap = new Map(prev);
      newMap.set(site.id, { 
        status: 'starting', 
        message: 'Initializing scan...', 
        attempts: 0,
        progress: 5
      });
      console.log('✅ Set initial progress for:', site.id);
      return newMap;
    });
    
    // ✅ FORCE: Trigger re-render immediately
    setForceUpdate(prev => prev + 1);
    
    setError('');
    
    try {
      console.log('🚀 Calling backend to start scan...');
      const scan = await scanning.startScan(site.id);
      console.log('✅ Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      
      const maxAttempts = Math.ceil((MAX_SCAN_MINUTES * 60 * 1000) / POLL_EVERY_MS);
      let attempts = 0;

      const updateProgress = (status, message, progress = 0) => {
        console.log(`📊 Updating progress: ${status} - ${message} (${progress}%)`);
        setScanProgress(prev => {
          const newMap = new Map(prev);
          newMap.set(site.id, {
            status,
            message,
            attempts,
            progress
          });
          return newMap;
        });
        setForceUpdate(prev => prev + 1); // Force re-render
      };

      const cleanupScan = (delay = 2000) => {
        setTimeout(() => {
          if (!mountedRef.current) return;
          console.log('🧹 Cleaning up scan UI for:', site.id);
          setScanningIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(site.id);
            return newSet;
          });
          setScanProgress(prev => {
            const newMap = new Map(prev);
            newMap.delete(site.id);
            return newMap;
          });
          setForceUpdate(prev => prev + 1);
        }, delay);
      };
      
      const pollForCompletion = async () => {
        try {
          attempts++;
          console.log(`🔄 Polling attempt ${attempts} for scan ${scan.id}`);
          
          const elapsedMinutes = Math.floor(attempts * POLL_EVERY_MS / 60000);
          const elapsedSeconds = Math.floor((attempts * POLL_EVERY_MS % 60000) / 1000);
          const progressPercent = Math.min((attempts / maxAttempts) * 95, 95);
          
          updateProgress('scanning', `Scanning... (${elapsedMinutes}m ${elapsedSeconds}s)`, progressPercent);
          
          const meta = await scanning.getScanMeta(scan.id);
          console.log(`📊 Scan meta (attempt ${attempts}):`, meta);
          
          if (meta && meta.status === 'done') {
            console.log('✅ Scan completed! Updating UI...');
            updateProgress('completed', 'Scan completed successfully!', 100);
            
            // Auto-open results
            setTimeout(() => {
              if (mountedRef.current && onViewResults) {
                console.log('🎯 Auto-opening results for scan:', scan.id);
                onViewResults(scan.id);
              }
            }, 1000);
            
            await loadWebsites();
            cleanupScan();
            
          } else if (meta && meta.status === 'error') {
            throw new Error('Scan failed on backend');
          } else if (attempts >= maxAttempts) {
            throw new Error(`Scan timed out after ${MAX_SCAN_MINUTES} minutes`);
          } else {
            // Continue polling
            setTimeout(pollForCompletion, POLL_EVERY_MS);
          }
        } catch (e) {
          console.error('❌ Polling error:', e);
          
          const errorMessage = String(e?.message || '');
          const isRetryableError = /502|503|429|network|fetch|timeout/i.test(errorMessage);
          
          if (isRetryableError && attempts < maxAttempts) {
            const progressPercent = Math.min((attempts / maxAttempts) * 95, 95);
            updateProgress('retrying', `Connection issue, retrying... (${attempts}/${maxAttempts})`, progressPercent);
            setTimeout(pollForCompletion, 3000);
            return;
          }
          
          if (attempts >= maxAttempts) {
            setError(`Scan timed out after ${Math.floor(attempts * POLL_EVERY_MS / 60000)} minutes.`);
            updateProgress('timeout', 'Scan timed out - may still be processing', 95);
          } else {
            setError(errorMessage || 'Scan failed');
            updateProgress('error', 'Scan failed - please try again', 0);
          }
          
          cleanupScan(5000);
        }
      };
      
      // Start polling
      pollForCompletion();
      
    } catch (e) {
      console.error('❌ Failed to start scan:', e);
      setError(e.message || 'Failed to start scan');
      setScanningIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(site.id);
        return newSet;
      });
      setScanProgress(prev => {
        const newMap = new Map(prev);
        newMap.delete(site.id);
        return newMap;
      });
      setForceUpdate(prev => prev + 1);
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
          
          // ✅ DEBUG: Log render state
          console.log(`🎨 Rendering site ${site.id}: isScanning=${isScanning}, progress=`, progress);
          
          return (
            <div key={`${site.id}-${forceUpdate}`} className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {/* ✅ BULLETPROOF: Always show progress when scanning */}
              {isScanning && (
                <div className={`mb-3 p-3 rounded-md border ${
                  progress?.status === 'completed' ? 'bg-green-50 border-green-200' :
                  progress?.status === 'error' ? 'bg-red-50 border-red-200' :
                  progress?.status === 'timeout' ? 'bg-yellow-50 border-yellow-200' :
                  progress?.status === 'retrying' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sm">
                    {(!progress || progress.status === 'starting' || progress.status === 'scanning') && 
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress?.status === 'retrying' && <Clock className="h-4 w-4 text-orange-600" />}
                    {progress?.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {progress?.status === 'timeout' && <Clock className="h-4 w-4 text-yellow-600" />}
                    {progress?.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    
                    <span className={`font-medium ${
                      progress?.status === 'completed' ? 'text-green-700' :
                      progress?.status === 'error' ? 'text-red-700' :
                      progress?.status === 'timeout' ? 'text-yellow-700' :
                      progress?.status === 'retrying' ? 'text-orange-700' :
                      'text-blue-700'
                    }`}>
                      {progress?.message || 'Scanning...'}
                    </span>
                  </div>
                  
                  {/* ✅ ALWAYS SHOW: Progress bar when scanning */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress?.status === 'completed' ? 'bg-green-600' :
                        progress?.status === 'retrying' ? 'bg-orange-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${progress?.progress || 5}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleScan(site)}
                  disabled={isScanning}
                  className={`rounded-md px-3 py-2 text-sm font-medium flex items-center gap-2 transition-colors ${
                    isScanning 
                      ? 'bg-gray-400 text-white cursor-not-allowed opacity-60' 
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
