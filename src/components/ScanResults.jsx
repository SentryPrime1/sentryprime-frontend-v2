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
  RefreshCw,
  Shield,
  AlertCircle,
  AlertOctagon,
  InfoIcon
} from 'lucide-react';
import { scanning, dashboard } from '../utils/api';

export default function ScanResults({ scanId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [violations, setViolations] = useState([]);
  const [error, setError] = useState('');
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showCode, setShowCode] = useState(false);
  const [fallbackScans, setFallbackScans] = useState([]);
  const [showFallback, setShowFallback] = useState(false);

  // ✅ NEW: Calculate violation breakdown by severity
  const getViolationBreakdown = () => {
    const breakdown = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      unknown: 0
    };

    violations.forEach(violation => {
      const impact = violation.impact || 'unknown';
      if (breakdown.hasOwnProperty(impact)) {
        breakdown[impact]++;
      } else {
        breakdown.unknown++;
      }
    });

    return breakdown;
  };

  const breakdown = getViolationBreakdown();

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
      }
    };

    const fetchResultsWithPolling = async () => {
      if (scanId.startsWith('fallback-')) {
        console.log('🔍 Detected fallback scan ID, will show available scans instead');
        
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

      for (let i = 0; i < 15; i++) {
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
      case 'critical': return AlertOctagon;
      case 'serious': return AlertTriangle;
      case 'moderate': return AlertCircle;
      case 'minor': return InfoIcon;
      default: return Info;
    }
  };

  // ✅ NEW: Get breakdown card styling
  const getBreakdownCardStyle = (severity, count) => {
    const baseStyle = "rounded-lg p-4 border-2 transition-all duration-200 hover:shadow-md";
    
    if (count === 0) {
      return `${baseStyle} bg-gray-50 border-gray-200 opacity-60`;
    }
    
    switch (severity) {
      case 'critical': return `${baseStyle} bg-red-50 border-red-200 hover:bg-red-100`;
      case 'serious': return `${baseStyle} bg-orange-50 border-orange-200 hover:bg-orange-100`;
      case 'moderate': return `${baseStyle} bg-yellow-50 border-yellow-200 hover:bg-yellow-100`;
      case 'minor': return `${baseStyle} bg-blue-50 border-blue-200 hover:bg-blue-100`;
      default: return `${baseStyle} bg-gray-50 border-gray-200 hover:bg-gray-100`;
    }
  };

  const handleSelectScan = (scan) => {
    console.log('🔍 User selected scan from fallback list:', scan.id);
    window.location.hash = `#scan-${scan.id}`;
    setLoading(true);
    setError('');
    setShowFallback(false);
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

      {/* ✅ NEW: Violation Breakdown Summary */}
      {!loading && !error && !showFallback && violations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Shield className="h-6 w-6 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Violation Breakdown</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Critical */}
              <div className={getBreakdownCardStyle('critical', breakdown.critical)}>
                <div className="flex items-center space-x-3">
                  <AlertOctagon className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{breakdown.critical}</p>
                    <p className="text-sm font-medium text-red-700">Critical</p>
                    <p className="text-xs text-red-600">Fix immediately</p>
                  </div>
                </div>
              </div>

              {/* Serious */}
              <div className={getBreakdownCardStyle('serious', breakdown.serious)}>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{breakdown.serious}</p>
                    <p className="text-sm font-medium text-orange-700">Serious</p>
                    <p className="text-xs text-orange-600">High priority</p>
                  </div>
                </div>
              </div>

              {/* Moderate */}
              <div className={getBreakdownCardStyle('moderate', breakdown.moderate)}>
                <div className="flex items-center space-x-3">
                  <AlertCircle className="h-8 w-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">{breakdown.moderate}</p>
                    <p className="text-sm font-medium text-yellow-700">Moderate</p>
                    <p className="text-xs text-yellow-600">Medium priority</p>
                  </div>
                </div>
              </div>

              {/* Minor */}
              <div className={getBreakdownCardStyle('minor', breakdown.minor)}>
                <div className="flex items-center space-x-3">
                  <InfoIcon className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{breakdown.minor}</p>
                    <p className="text-sm font-medium text-blue-700">Minor</p>
                    <p className="text-xs text-blue-600">Low priority</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority Recommendation */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Brain className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Recommended Priority:</p>
                  <p className="text-sm text-gray-600">
                    {breakdown.critical > 0 && "Start with critical issues - these prevent users from accessing content."}
                    {breakdown.critical === 0 && breakdown.serious > 0 && "Focus on serious issues first - these significantly impact user experience."}
                    {breakdown.critical === 0 && breakdown.serious === 0 && breakdown.moderate > 0 && "Address moderate issues to improve overall accessibility."}
                    {breakdown.critical === 0 && breakdown.serious === 0 && breakdown.moderate === 0 && breakdown.minor > 0 && "Great job! Only minor issues remain - these are easy wins for better accessibility."}
                    {violations.length === 0 && "Excellent! No accessibility violations found."}
                  </p>
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
