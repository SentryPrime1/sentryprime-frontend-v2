import React, { useEffect, useState, useMemo } from 'react';
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
  AlertOctagon,
  AlertCircle,
  X
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
  
  // ✅ NEW: Interactive filtering state
  const [selectedFilter, setSelectedFilter] = useState(null);

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

  // ✅ NEW: Memoized violation breakdown calculation
  const breakdown = useMemo(() => {
    const result = { critical: 0, serious: 0, moderate: 0, minor: 0 };
    
    for (const violation of violations) {
      const impact = (violation.impact ?? 'minor').toLowerCase();
      if (result.hasOwnProperty(impact)) {
        result[impact]++;
      }
    }
    
    return result;
  }, [violations]);

  // ✅ NEW: Memoized filtered violations
  const filteredViolations = useMemo(() => {
    if (!selectedFilter) return violations;
    
    return violations.filter(violation => {
      const impact = (violation.impact ?? 'minor').toLowerCase();
      return impact === selectedFilter;
    });
  }, [violations, selectedFilter]);

  // ✅ NEW: Memoized sorted violations
  const sortedViolations = useMemo(() => {
    const impactOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    
    return [...filteredViolations].sort((a, b) => {
      const aImpact = (a.impact ?? 'minor').toLowerCase();
      const bImpact = (b.impact ?? 'minor').toLowerCase();
      return (impactOrder[aImpact] ?? 3) - (impactOrder[bImpact] ?? 3);
    });
  }, [filteredViolations]);

  // ✅ NEW: Dynamic header text
  const getHeaderText = () => {
    if (!selectedFilter) {
      return `${violations.length} accessibility violations found`;
    }
    
    const count = breakdown[selectedFilter] ?? 0;
    return `${count} ${selectedFilter} violations found`;
  };

  // ✅ NEW: Render breakdown card with full accessibility support
  const renderBreakdownCard = (severity, icon, label, description, colorClass) => {
    const Icon = icon;
    const count = breakdown[severity];
    const isActive = selectedFilter === severity;
    const isEmpty = count === 0;

    const handleClick = () => {
      if (isEmpty) return;
      
      if (isActive) {
        setSelectedFilter(null); // Toggle off if already selected
      } else {
        setSelectedFilter(severity);
      }
    };

    const handleKeyDown = (e) => {
      if (isEmpty) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div
        onClick={isEmpty ? undefined : handleClick}
        onKeyDown={handleKeyDown}
        tabIndex={isEmpty ? -1 : 0}
        role="button"
        aria-pressed={isActive}
        aria-disabled={isEmpty}
        className={`
          relative p-4 rounded-lg border-2 transition-all duration-200
          ${isEmpty 
            ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
            : 'bg-white border-gray-200 cursor-pointer hover:scale-[1.02] hover:shadow-md'
          }
          ${isActive 
            ? `ring-2 ring-offset-2 ${colorClass.includes('red') ? 'ring-red-500' : 
                colorClass.includes('orange') ? 'ring-orange-500' :
                colorClass.includes('yellow') ? 'ring-yellow-500' : 'ring-blue-500'} shadow-lg scale-[1.02]`
            : ''
          }
        `}
      >
        {isActive && (
          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
            Active Filter
          </div>
        )}
        
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold text-gray-900">{count}</span>
              {isActive && <span className="text-blue-600">🔍</span>}
            </div>
            <p className="font-medium text-gray-900">{label}</p>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </div>
    );
  };

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
        
        {/* ✅ NEW: Show All button when filtering */}
        {selectedFilter && (
          <button
            onClick={() => setSelectedFilter(null)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Show All
          </button>
        )}
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

      {/* ✅ NEW: Interactive Violation Breakdown */}
      {!loading && !error && !showFallback && violations.length > 0 && (
        <>
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">📊 Violation Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderBreakdownCard(
                'critical',
                AlertOctagon,
                'Critical',
                'Fix immediately',
                'text-red-600 bg-red-100 border-red-200'
              )}
              {renderBreakdownCard(
                'serious',
                AlertTriangle,
                'Serious',
                'High priority',
                'text-orange-600 bg-orange-100 border-orange-200'
              )}
              {renderBreakdownCard(
                'moderate',
                AlertCircle,
                'Moderate',
                'Medium priority',
                'text-yellow-600 bg-yellow-100 border-yellow-200'
              )}
              {renderBreakdownCard(
                'minor',
                Info,
                'Minor',
                'Low priority',
                'text-blue-600 bg-blue-100 border-blue-200'
              )}
            </div>
            
            {/* ✅ NEW: Smart recommendations based on breakdown */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 <strong>Recommended Priority:</strong> {
                  breakdown.critical > 0 ? 'Start with critical issues - these prevent users from accessing content.' :
                  breakdown.serious > 0 ? 'Focus on serious issues - these significantly impact user experience.' :
                  breakdown.moderate > 0 ? 'Address moderate issues - these create barriers for some users.' :
                  'Great job! Only minor issues remain - these are easy wins for better accessibility.'
                }
              </p>
            </div>
          </div>

          <div className="text-sm text-gray-600 mb-4">
            {getHeaderText()}
          </div>
          
          <div className="space-y-4">
            {sortedViolations.slice(0, 100).map((violation, i) => {
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
