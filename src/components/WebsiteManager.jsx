import React, { useEffect, useState, useRef } from 'react';
import { dashboard, websites, scanning } from '../utils/api';
import { Eye, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function WebsiteManager({ onWebsiteAdded, onScanStarted, onViewResults }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [scanningIds, setScanningIds] = useState(new Set());
  const [scanProgress, setScanProgress] = useState(new Map());
  const [error, setError] = useState('');

  // Use refs to persist scanning state across re-renders and loadWebsites calls
  const scanningRef = useRef(new Set());
  const progressRef = useRef(new Map());
  const initialLoadDone = useRef(false);

  const loadWebsites = async (preserveScanning = null) => {
    // SMART DEFAULT: Preserve scanning state unless explicitly clearing or initial load
    const shouldPreserve = preserveScanning !== null ? preserveScanning : initialLoadDone.current;
    
    console.log('🔄 DEBUG: loadWebsites called, preserveScanning:', preserveScanning, 'shouldPreserve:', shouldPreserve);
    console.trace('🔍 DEBUG: loadWebsites call stack');
    
    setError('');
    try {
      setLoading(true);
      const items = await dashboard.getWebsites();
      console.log('🔄 DEBUG: Loaded websites:', items.length);
      setList(items);

      // CRITICAL: Smart preservation logic
      if (!shouldPreserve) {
        console.log('🧹 DEBUG: Clearing scanning state (shouldPreserve=false)');
        setScanningIds(new Set());
        setScanProgress(new Map());
        scanningRef.current = new Set();
        progressRef.current = new Map();
      } else {
        console.log('✅ DEBUG: Preserving scanning state (shouldPreserve=true)');
        // Restore scanning state from refs
        setScanningIds(new Set(scanningRef.current));
        setScanProgress(new Map(progressRef.current));
      }
      
      initialLoadDone.current = true;
    } catch (e) {
      console.error('❌ DEBUG: loadWebsites error:', e);
      setError(e.message || 'Failed to load websites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only clear on initial load
    loadWebsites(false);
  }, []);

  const handleAddWebsite = async (e) => {
    e.preventDefault();
    if (!newWebsiteUrl.trim()) return;

    setAdding(true);
    setError('');
    try {
      await websites.add({ url: newWebsiteUrl.trim() });
      setNewWebsiteUrl('');
      // Always preserve scanning state when adding websites
      await loadWebsites(true);
      onWebsiteAdded && onWebsiteAdded();
    } catch (e) {
      setError(e.message || 'Failed to add website');
    } finally {
      setAdding(false);
    }
  };

  const handleScan = async (site) => {
    console.log('🚀 DEBUG: handleScan called for site:', site.id);
    
    // Step 1: Set initial state AND persist in refs
    console.log('📊 DEBUG: Setting initial scanning state');
    
    const newScanningIds = new Set(scanningIds);
    newScanningIds.add(site.id);
    setScanningIds(newScanningIds);
    scanningRef.current = new Set(newScanningIds);
    
    const newProgress = new Map(scanProgress);
    newProgress.set(site.id, {
      status: 'starting',
      message: 'Starting scan...',
      progress: 10
    });
    setScanProgress(newProgress);
    progressRef.current = new Map(newProgress);
    
    console.log('📊 DEBUG: scanningIds updated, size:', newScanningIds.size);
    console.log('📊 DEBUG: scanProgress updated for site:', site.id);
    
    setError('');
    
    try {
      // Step 2: Start scan
      console.log('🚀 DEBUG: Calling scanning.startScan');
      const scan = await scanning.startScan(site.id);
      console.log('✅ DEBUG: Scan created with ID:', scan.id);
      onScanStarted && onScanStarted(scan);
      
      // Step 3: Start polling
      let attempts = 0;
      const maxAttempts = 300; // 10 minutes
      
      const pollForCompletion = async () => {
        attempts++;
        console.log(`🔄 DEBUG: Polling attempt ${attempts} for scan ${scan.id}`);
        
        // Update progress in both state and refs
        const elapsedMinutes = Math.floor(attempts * 2000 / 60000);
        const elapsedSeconds = Math.floor((attempts * 2000 % 60000) / 1000);
        const progressPercent = Math.min((attempts / maxAttempts) * 90, 90);
        
        console.log(`📊 DEBUG: Updating progress to ${progressPercent}% (${elapsedMinutes}m ${elapsedSeconds}s)`);
        
        const updatedProgress = new Map(progressRef.current);
        updatedProgress.set(site.id, {
          status: 'scanning',
          message: `Scanning... (${elapsedMinutes}m ${elapsedSeconds}s)`,
          progress: progressPercent
        });
        setScanProgress(updatedProgress);
        progressRef.current = updatedProgress;
        console.log('📊 DEBUG: Progress updated in state and ref');
        
        try {
          console.log('🔍 DEBUG: Calling scanning.getScanMeta');
          const meta = await scanning.getScanMeta(scan.id);
          console.log(`📊 DEBUG: Scan meta received:`, meta);
          
          if (meta && meta.status === 'done') {
            console.log('✅ DEBUG: Scan completed successfully!');
            
            // Show completion in both state and refs
            const completedProgress = new Map(progressRef.current);
            completedProgress.set(site.id, {
              status: 'completed',
              message: 'Scan completed successfully!',
              progress: 100
            });
            setScanProgress(completedProgress);
            progressRef.current = completedProgress;
            console.log('📊 DEBUG: Completion state set');
            
            // Auto-open results
            console.log('🎯 DEBUG: Setting auto-open timer');
            setTimeout(() => {
              console.log('🎯 DEBUG: Auto-opening results');
              if (onViewResults) {
                onViewResults(scan.id);
              }
            }, 1500);
            
            // Clean up after delay
            console.log('🧹 DEBUG: Setting cleanup timer');
            setTimeout(() => {
              console.log('🧹 DEBUG: Cleaning up scan state');
              
              const cleanScanningIds = new Set(scanningRef.current);
              cleanScanningIds.delete(site.id);
              setScanningIds(cleanScanningIds);
              scanningRef.current = cleanScanningIds;
              
              const cleanProgress = new Map(progressRef.current);
              cleanProgress.delete(site.id);
              setScanProgress(cleanProgress);
              progressRef.current = cleanProgress;
              
              console.log('🧹 DEBUG: Removed from scanningIds and scanProgress');
              console.log('🔄 DEBUG: Reloading websites with preserveScanning=true');
              loadWebsites(true); // Always preserve other ongoing scans
            }, 3000);
            
            return; // Stop polling
            
          } else if (meta && meta.status === 'error') {
            throw new Error('Scan failed on backend');
          } else if (attempts >= maxAttempts) {
            throw new Error('Scan timed out after 10 minutes');
          } else {
            // Continue polling
            console.log('⏰ DEBUG: Scheduling next poll in 2 seconds');
            setTimeout(() => {
              console.log('⏰ DEBUG: Executing scheduled poll');
              pollForCompletion();
            }, 2000);
          }
        } catch (e) {
          console.error('❌ DEBUG: Polling error:', e);
          
          // Handle retryable errors
          if (attempts < maxAttempts && /502|503|429|network|fetch/i.test(e.message)) {
            console.log('🔄 DEBUG: Retryable error, scheduling retry');
            const retryProgress = new Map(progressRef.current);
            retryProgress.set(site.id, {
              status: 'retrying',
              message: `Connection issue, retrying... (${attempts}/${maxAttempts})`,
              progress: progressPercent
            });
            setScanProgress(retryProgress);
            progressRef.current = retryProgress;
            
            setTimeout(() => {
              console.log('🔄 DEBUG: Executing retry');
              pollForCompletion();
            }, 3000);
            return;
          }
          
          // Permanent error
          console.error('❌ DEBUG: Permanent error, stopping scan');
          setError(e.message || 'Scan failed');
          
          const errorProgress = new Map(progressRef.current);
          errorProgress.set(site.id, {
            status: 'error',
            message: 'Scan failed - please try again',
            progress: 0
          });
          setScanProgress(errorProgress);
          progressRef.current = errorProgress;
          
          setTimeout(() => {
            console.log('🧹 DEBUG: Cleaning up failed scan');
            const cleanScanningIds = new Set(scanningRef.current);
            cleanScanningIds.delete(site.id);
            setScanningIds(cleanScanningIds);
            scanningRef.current = cleanScanningIds;
            
            const cleanProgress = new Map(progressRef.current);
            cleanProgress.delete(site.id);
            setScanProgress(cleanProgress);
            progressRef.current = cleanProgress;
          }, 5000);
        }
      };
      
      // Start polling immediately
      console.log('🚀 DEBUG: Starting initial poll');
      pollForCompletion();
      
    } catch (e) {
      console.error('❌ DEBUG: Failed to start scan:', e);
      setError(e.message || 'Failed to start scan');
      
      const cleanScanningIds = new Set(scanningRef.current);
      cleanScanningIds.delete(site.id);
      setScanningIds(cleanScanningIds);
      scanningRef.current = cleanScanningIds;
      
      const cleanProgress = new Map(progressRef.current);
      cleanProgress.delete(site.id);
      setScanProgress(cleanProgress);
      progressRef.current = cleanProgress;
    }
  };

  const handleViewResults = (scanId) => {
    console.log('🔍 DEBUG: Viewing results for scan ID:', scanId);
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
          
          console.log(`🎨 DEBUG: Rendering site ${site.id}: isScanning=${isScanning}, progress=`, progress);
          
          return (
            <div key={site.id} className="rounded-lg border p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="mb-2 font-medium text-gray-900">{site.name || site.url}</div>
              <div className="mb-3 text-sm text-gray-600 break-all">{site.url}</div>

              {/* Progress indicator */}
              {isScanning && progress && (
                <div className={`mb-3 p-3 rounded-md border ${
                  progress.status === 'completed' ? 'bg-green-50 border-green-200' :
                  progress.status === 'error' ? 'bg-red-50 border-red-200' :
                  progress.status === 'retrying' ? 'bg-orange-50 border-orange-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2 text-sm">
                    {(progress.status === 'starting' || progress.status === 'scanning') && 
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {progress.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    
                    <span className={`font-medium ${
                      progress.status === 'completed' ? 'text-green-700' :
                      progress.status === 'error' ? 'text-red-700' :
                      progress.status === 'retrying' ? 'text-orange-700' :
                      'text-blue-700'
                    }`}>
                      {progress.message}
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        progress.status === 'completed' ? 'bg-green-600' :
                        progress.status === 'retrying' ? 'bg-orange-600' :
                        'bg-blue-600'
                      }`}
                      style={{ width: `${progress.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => {
                    console.log('🖱️ DEBUG: Scan button clicked for site:', site.id);
                    handleScan(site);
                  }}
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
