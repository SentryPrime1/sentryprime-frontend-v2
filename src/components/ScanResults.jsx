import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ExternalLink, 
  Brain, 
  Code, 
  Eye,
  BarChart3,
  Calendar,
  Globe,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { scanning, dashboard } from '../utils/api';

export default function ScanResults({ scanId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [violations, setViolations] = useState([]);
  const [error, setError] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [fallbackScans, setFallbackScans] = useState([]); // ✅ NEW: Store available scans for fallback
  const [showFallback, setShowFallback] = useState(false); // ✅ NEW: Show fallback scan list

  useEffect(() => {
    if (!scanId) return;
    console.log('ScanResults received scanId:', scanId);

    let cancelled = false;

    const fetchMeta = async () => {
      try {
        const r = await fetchScanMeta(scanId);
        if (!cancelled) setMeta(r);
      } catch (e) {
        console.error('Failed to fetch scan meta:', e);
        // Don't set error here, let the main polling handle it
      }
    };

    const fetchResultsWithPolling = async () => {
      // ✅ FIXED: Detect fallback scan IDs and handle them differently
      if (scanId.startsWith('fallback-')) {
        console.log('🔍 Detected fallback scan ID, will show available scans instead');
        
        // Try to get available scans for this user
        try {
          const scans = await dashboard.getScans();
          if (!cancelled) {
            setFallbackScans(scans);
            setShowFallback(true);
            setLoading(false);
          }
        } catch (e) {
          if (!cancelled) {
            setError('Unable to load scan results. Please try running a new scan.');
            setLoading(false);
          }
        }
        return;
      }

      // ✅ IMPROVED: Reduced polling attempts and better error handling
      for (let i = 0; i < 15; i++) { // Reduced from 60 to 15 attempts (30 seconds max)
        try {
          const res = await scanning.getScanResults(scanId);
          if (res && Array.isArray(res.violations)) {
            if (!cancelled) {
              setViolations(res.violations);
              setLoading(false);
            }
            return;
          }
        } catch (e) {
          console.log(`Poll attempt ${i + 1}: ${e.message}`);
          
          // ✅ NEW: After several failed attempts, try to show available scans
          if (i > 5 && e.message.includes('404')) {
            console.log('🔍 Scan not found after multiple attempts, showing available scans');
            try {
              const scans = await dashboard.getScans();
              if (!cancelled) {
                setFallbackScans(scans);
                setShowFallback(true);
                setLoading(false);
              }
            } catch (fallbackError) {
              // Continue polling if we can't get fallback scans
            }
            return;
          }
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      
      // ✅ IMPROVED: Better timeout handling with fallback option
      if (!cancelled) {
        try {
          const scans = await dashboard.getScans();
          setFallbackScans(scans);
          setShowFallback(true);
          setError('The requested scan could not be found. Here are your available scans:');
        } catch (e) {
          setError('Unable to load scan results. Please try running a new scan.');
        }
        setLoading(false);
      }
    };

    const run = async () => {
      setLoading(true);
      setError('');
      setShowFallback(false);
      try {
        await Promise.all([fetchMeta(), fetchResultsWithPolling()]);
      } catch (e) {
        if (!cancelled) {
          setError(e.message || 'Failed to load scan results');
          setLoading(false);
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, [scanId]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'serious': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'minor': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return AlertTriangle;
      case 'serious': return AlertTriangle;
      case 'moderate': return Info;
      case 'minor': return Info;
      default: return Info;
    }
  };

  // ✅ NEW: Handle scan selection from fallback list
  const handleSelectScan = (scan) => {
    console.log('🔍 User selected scan from fallback list:', scan.id);
    // This will trigger a re-render with the new scan ID
    window.location.hash = `#scan-${scan.id}`;
    // Or if you have a proper router, navigate to the scan
    // For now, we'll just reload the component with the new ID
    setLoading(true);
    setError('');
    setShowFallback(false);
    // The parent component should handle this by updating the scanId prop
  };

  if (!scanId) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No scan selected</h3>
          <p className="text-gray-600">
            Select a website and run a scan to view detailed results here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={onBack} className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Scan Results</h2>
            <p className="text-gray-600 mt-1">Detailed accessibility analysis</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scan results...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
        </div>
      )}

      {/* ✅ NEW: Improved error handling with fallback scan list */}
      {(error || showFallback) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="h-5 w-5 text-yellow-600" />
            <p className="text-yellow-800 font-medium">
              {error || 'Scan not found'}
            </p>
          </div>
          
          {fallbackScans.length > 0 && (
            <div>
              <p className="text-yellow-700 mb-3">Available scans:</p>
              <div className="space-y-2">
                {fallbackScans.slice(0, 5).map((scan) => (
                  <div key={scan.id} className="flex items-center justify-between p-3 bg-white rounded border">
                    <div>
                      <p className="font-medium text-gray-900">{scan.url}</p>
                      <p className="text-sm text-gray-500">
                        {scan.total_violations || 0} violations • 
                        {scan.compliance_score || 0}% compliance • 
                        {scan.created_at ? new Date(scan.created_at).toLocaleDateString() : 'Unknown date'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleSelectScan(scan)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {fallbackScans.length === 0 && (
            <p className="text-yellow-700">
              No scans available. Please run a new scan from the Websites tab.
            </p>
          )}
        </div>
      )}

      {meta && !showFallback && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Globe className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-500">Website</p>
                  <p className="font-medium text-gray-900">{meta.url || 'Unknown'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-500">Scan Date</p>
                  <p className="font-medium text-gray-900">
                    {meta.scan_date ? new Date(meta.scan_date).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-500">Total Issues</p>
                  <p className="font-medium text-gray-900 text-2xl">{violations.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !showFallback && violations.length > 0 && (
        <>
          <div className="text-sm text-gray-600 mb-4">
            {violations.length} accessibility violations found
          </div>
          
          <div className="space-y-4">
            {violations.slice(0, 100).map((violation, i) => {
              const SeverityIcon = getSeverityIcon(violation.impact);
              
              return (
                <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg border ${getSeverityColor(violation.impact)}`}>
                        <SeverityIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{violation.id}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(violation.impact)}`}>
                            {violation.impact || 'unknown'}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{violation.description}</p>
                        
                        {violation.help && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>How to fix:</strong> {violation.help}
                          </p>
                        )}
                        
                        {violation.nodes && violation.nodes.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <strong>Affected elements:</strong> {violation.nodes.length}
                            </p>
                            <details className="mt-1">
                              <summary className="text-sm text-blue-600 cursor-pointer">Show elements</summary>
                              <ul className="mt-2 text-xs space-y-1">
                                {violation.nodes.slice(0, 5).map((node, idx) => (
                                  <li key={idx} className="bg-gray-100 p-2 rounded">
                                    <code>{Array.isArray(node.target) ? node.target.join(', ') : node.target}</code>
                                    {node.failureSummary && (
                                      <div className="text-gray-600 mt-1">{node.failureSummary}</div>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {violation.helpUrl && (
                        <a
                          href={violation.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Learn More
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// helper — get scan meta/status
async function fetchScanMeta(scanId) {
  const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://sentryprime-backend-v2-production.up.railway.app'}/api/scans/${scanId}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('sentryprime_token')}`
    }
  });
  if (res.status === 202) {
    return { status: 'running' };
  }
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${res.status}`);
  }
  return res.json();
}
