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
  Shield,
  AlertCircle,
  AlertOctagon,
  InfoIcon,
  X,
  Filter
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
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all', 'critical', 'serious', 'moderate', 'minor'

  // ✅ OPTIMIZED: Memoized violation breakdown with impact normalization
  const breakdown = useMemo(() => {
    const b = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
    for (const v of violations) {
      const key = (v.impact || 'unknown').toLowerCase();
      b[key] = (b[key] ?? 0) + 1;
    }
    return b;
  }, [violations]);

  // ✅ OPTIMIZED: Memoized filtered violations with normalized comparison
  const filteredViolations = useMemo(() => {
    if (selectedFilter === 'all') return violations;
    return violations.filter(v => (v.impact || 'unknown').toLowerCase() === selectedFilter);
  }, [violations, selectedFilter]);

  // ✅ OPTIMIZED: Memoized sorted violations with normalized impact comparison
  const sortedViolations = useMemo(() => {
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3, unknown: 4 };
    return [...filteredViolations].sort((a, b) =>
      (order[(a.impact || 'unknown').toLowerCase()] ?? 4) -
      (order[(b.impact || 'unknown').toLowerCase()] ?? 4)
    );
  }, [filteredViolations]);

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

  // ✅ IMPROVED: Fixed Tailwind scale class and better disabled state
  const getBreakdownCardStyle = (severity, count, isActive) => {
    const baseStyle = "rounded-lg p-4 border-2 transition-all duration-200 transform";
    
    if (count === 0) {
      return `${baseStyle} bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed`;
    }
    
    const activeStyle = isActive ? "ring-2 ring-offset-2 scale-105 shadow-lg" : "hover:shadow-md hover:scale-[1.02]";
    const interactiveStyle = "cursor-pointer";
    
    switch (severity) {
      case 'critical': 
        return `${baseStyle} ${activeStyle} ${interactiveStyle} bg-red-50 border-red-200 hover:bg-red-100 ${isActive ? 'ring-red-300 bg-red-100 border-red-300' : ''}`;
      case 'serious': 
        return `${baseStyle} ${activeStyle} ${interactiveStyle} bg-orange-50 border-orange-200 hover:bg-orange-100 ${isActive ? 'ring-orange-300 bg-orange-100 border-orange-300' : ''}`;
      case 'moderate': 
        return `${baseStyle} ${activeStyle} ${interactiveStyle} bg-yellow-50 border-yellow-200 hover:bg-yellow-100 ${isActive ? 'ring-yellow-300 bg-yellow-100 border-yellow-300' : ''}`;
      case 'minor': 
        return `${baseStyle} ${activeStyle} ${interactiveStyle} bg-blue-50 border-blue-200 hover:bg-blue-100 ${isActive ? 'ring-blue-300 bg-blue-100 border-blue-300' : ''}`;
      default: 
        return `${baseStyle} ${activeStyle} ${interactiveStyle} bg-gray-50 border-gray-200 hover:bg-gray-100 ${isActive ? 'ring-gray-300 bg-gray-100 border-gray-300' : ''}`;
    }
  };

  // Handle filter selection
  const handleFilterSelect = (severity) => {
    if (breakdown[severity] === 0) return; // Don't allow clicking on empty categories
    setSelectedFilter(severity === selectedFilter ? 'all' : severity);
  };

  // ✅ IMPROVED: Keyboard event handler for accessibility
  const handleKeyDown = (e, severity) => {
    if (breakdown[severity] === 0) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleFilterSelect(severity);
    }
  };

  // Get filter display text
  const getFilterDisplayText = () => {
    if (selectedFilter === 'all') {
      return `${violations.length} accessibility violations found`;
    }
    const count = breakdown[selectedFilter] || 0;
    const severityText = selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1);
    return `${count} ${selectedFilter} violations found`;
  };

  // ✅ NEW: Render breakdown card with full accessibility support
  const renderBreakdownCard = (severity, icon: React.ComponentType, label, description, colorClass) => {
    const Icon = icon;
    const count = breakdown[severity];
    const isActive = selectedFilter === severity;
    const isEmpty = count === 0;

    return (
      <div
        className={getBreakdownCardStyle(severity, count, isActive)}
        onClick={isEmpty ? undefined : () => handleFilterSelect(severity)}
        onKeyDown={isEmpty ? undefined : (e) => handleKeyDown(e, severity)}
        aria-pressed={isActive}
        aria-disabled={isEmpty}
        role="button"
        tabIndex={isEmpty ? -1 : 0}
      >
        <div className="flex items-center space-x-3">
          <Icon className={`h-8 w-8 ${colorClass}`} />
          <div>
            <p className={`text-2xl font-bold ${colorClass}`}>{count}</p>
            <p className={`text-sm font-medium ${colorClass.replace('text-', 'text-').replace('-600', '-700')}`}>{label}</p>
            <p className={`text-xs ${colorClass}`}>{description}</p>
          </div>
        </div>
        {isActive && (
          <div className="mt-2 flex items-center space-x-1">
            <Filter className={`h-3 w-3 ${colorClass}`} />
            <span className={`text-xs ${colorClass} font-medium`}>Active Filter</span>
          </div>
        )}
      </div>
    );
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

      {/* ✅ OPTIMIZED: Interactive Violation Breakdown Summary */}
      {!loading && !error && !showFallback && violations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Shield className="h-6 w-6 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Violation Breakdown</h3>
              </div>
              
              {/* Active filter indicator and clear button */}
              {selectedFilter !== 'all' && (
                <button
                  onClick={() => setSelectedFilter('all')}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Show All
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* ✅ IMPROVED: Accessible breakdown cards */}
              {renderBreakdownCard('critical', AlertOctagon, 'Critical', 'Fix immediately', 'text-red-600')}
              {renderBreakdownCard('serious', AlertTriangle, 'Serious', 'High priority', 'text-orange-600')}
              {renderBreakdownCard('moderate', AlertCircle, 'Moderate', 'Medium priority', 'text-yellow-600')}
              {renderBreakdownCard('minor', InfoIcon, 'Minor', 'Low priority', 'text-blue-600')}
            </div>

            {/* Priority Recommendation */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <Brain className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedFilter === 'all' ? 'Recommended Priority:' : `Filtering by ${selectedFilter} violations:`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedFilter === 'all' && breakdown.critical > 0 && "Start with critical issues - these prevent users from accessing content."}
                    {selectedFilter === 'all' && breakdown.critical === 0 && breakdown.serious > 0 && "Focus on serious issues first - these significantly impact user experience."}
                    {selectedFilter === 'all' && breakdown.critical === 0 && breakdown.serious === 0 && breakdown.moderate > 0 && "Address moderate issues to improve overall accessibility."}
                    {selectedFilter === 'all' && breakdown.critical === 0 && breakdown.serious === 0 && breakdown.moderate === 0 && breakdown.minor > 0 && "Great job! Only minor issues remain - these are easy wins for better accessibility."}
                    {selectedFilter === 'all' && violations.length === 0 && "Excellent! No accessibility violations found."}
                    {selectedFilter === 'critical' && "These issues prevent users from accessing content and must be fixed immediately."}
                    {selectedFilter === 'serious' && "These issues significantly impact user experience and should be prioritized."}
                    {selectedFilter === 'moderate' && "These issues affect accessibility but don't completely block users."}
                    {selectedFilter === 'minor' && "These are minor improvements that enhance overall accessibility."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && !showFallback && violations.length > 0 && (
        <>
          {/* Dynamic violation count with filter info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {getFilterDisplayText()}
            </div>
            {selectedFilter !== 'all' && (
              <div className="text-xs text-gray-500">
                Click "Show All" to see all {violations.length} violations
              </div>
            )}
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
