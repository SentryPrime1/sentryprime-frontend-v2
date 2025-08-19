import React, { useEffect, useState, useMemo, useRef } from 'react';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ExternalLink, 
  Brain, 
  Eye,
  BarChart3,
  Calendar,
  Globe,
  ArrowLeft,
  RefreshCw,
  AlertOctagon,
  AlertCircle,
  X,
  Lightbulb, 
  Target, 
  TrendingUp, 
  Clock,
  Zap,
  ArrowRight,
  Star,
  Award,
  HelpCircle
} from 'lucide-react';
import { scanning, dashboard } from '../utils/api';
// ✅ Import Alt Text AI components
import AltTextAISection from './AltTextAISection.jsx';

// AI Analysis Component (embedded) - BULLETPROOF ENTERPRISE VERSION
function AIAnalysis({ scanId, violations, meta }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Prevent repeated AI fetches on minor list changes
  const lastAnalyzedRef = useRef(null);

  useEffect(() => {
    if (!scanId || violations.length === 0) return;
    if (lastAnalyzedRef.current === scanId) return; // only once per scanId
    lastAnalyzedRef.current = scanId;
    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanId, violations.length]);

  const fetchAnalysis = async () => {
    if (!scanId) return;
    
    // ✅ ENTERPRISE: Ensure scanning.getAIAnalysis exists
    if (typeof scanning.getAIAnalysis !== 'function') {
      setError('AI Analysis not available - please check API configuration');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const result = await scanning.getAIAnalysis(scanId);
      setAnalysis(result);
    } catch (e) {
      console.error('AI Analysis failed:', e);
      setError(e.message || 'Failed to generate AI analysis');
    } finally {
      setLoading(false);
    }
  };

  const parseAnalysis = (analysisText) => {
    if (!analysisText) return null;

    const sections = {
      summary: '',
      priorities: [],
      maturity: '',
      nextSteps: ''
    };

    const lines = analysisText.split('\n').filter(line => line.trim());
    let currentSection = 'summary';
    let priorityCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toLowerCase().includes('executive summary') || 
          trimmed.toLowerCase().includes('summary')) {
        currentSection = 'summary';
        continue;
      } else if (trimmed.toLowerCase().includes('priority') || 
                 trimmed.toLowerCase().includes('top 3')) {
        currentSection = 'priorities';
        continue;
      } else if (trimmed.toLowerCase().includes('maturity') || 
                 trimmed.toLowerCase().includes('assessment')) {
        currentSection = 'maturity';
        continue;
      } else if (trimmed.toLowerCase().includes('next steps') || 
                 trimmed.toLowerCase().includes('recommended')) {
        currentSection = 'nextSteps';
        continue;
      }

      if (trimmed.length > 0) {
        if (currentSection === 'priorities' && 
            (trimmed.match(/^\d+\./) || trimmed.startsWith('-') || trimmed.startsWith('•'))) {
          if (priorityCount < 3) {
            sections.priorities.push(trimmed.replace(/^\d+\.\s*/, '').replace(/^[-•]\s*/, ''));
            priorityCount++;
          }
        } else if (currentSection !== 'priorities') {
          sections[currentSection] += (sections[currentSection] ? ' ' : '') + trimmed;
        }
      }
    }

    return sections;
  };

  const getComplianceLevel = (score) => {
    if (score >= 95) return { level: 'Excellent', color: 'text-green-600', icon: Award };
    if (score >= 85) return { level: 'Good', color: 'text-blue-600', icon: CheckCircle };
    if (score >= 70) return { level: 'Fair', color: 'text-yellow-600', icon: Clock };
    return { level: 'Needs Work', color: 'text-red-600', icon: AlertTriangle };
  };

  // Handle both shapes of the AI response (string vs object)
  const analysisText =
    typeof analysis === 'string'
      ? analysis
      : typeof analysis?.analysis === 'string'
        ? analysis.analysis
        : '';
  const parsedAnalysis = analysisText ? parseAnalysis(analysisText) : null;
  
  const complianceInfo = meta ? getComplianceLevel(meta.compliance_score || 0) : null;

  if (!scanId || violations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">AI Analysis</h3>
          <p className="text-gray-600">
            Run a scan to get AI-powered insights and recommendations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white shadow rounded-lg"
      role="status" 
      aria-busy={loading}
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">AI Analysis</h3>
              <p className="text-sm text-gray-600">
                Intelligent insights and recommendations
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* Render the compliance icon via a local variable */}
            {complianceInfo && (() => {
              const LevelIcon = complianceInfo.icon;
              return (
                <div className="flex items-center space-x-2">
                  <LevelIcon className={`h-5 w-5 ${complianceInfo.color}`} />
                  <span className={`text-sm font-medium ${complianceInfo.color}`}>
                    {complianceInfo.level}
                  </span>
                </div>
              );
            })()}
            
            <button
              onClick={fetchAnalysis}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating AI analysis...</p>
            <p className="text-sm text-gray-500 mt-1">This may take a few moments</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800 font-medium">Analysis Failed</p>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
            <button
              onClick={fetchAnalysis}
              className="mt-3 inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        )}

        {analysis && parsedAnalysis && !loading && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Issues</span>
                </div>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {analysis?.summary?.total_violations ?? violations.length}
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Compliance</span>
                </div>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {analysis?.summary?.compliance_score ?? meta?.compliance_score ?? 0}%
                </p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Pages Scanned</span>
                </div>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {analysis?.summary?.pages_scanned ?? 1}
                </p>
              </div>
            </div>

            {/* Executive Summary */}
            {parsedAnalysis.summary && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <Star className="h-5 w-5 text-gray-600" />
                  <h4 className="font-medium text-gray-900">Executive Summary</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">{parsedAnalysis.summary}</p>
              </div>
            )}

            {/* Priority Fixes */}
            {parsedAnalysis.priorities.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  <h4 className="font-medium text-gray-900">Top Priority Fixes</h4>
                </div>
                <div className="space-y-3">
                  {parsedAnalysis.priorities.map((priority, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex-shrink-0 w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-gray-700 flex-1">{priority}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            {parsedAnalysis.nextSteps && (
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <ArrowRight className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-gray-900">Recommended Next Steps</h4>
                </div>
                <p className="text-gray-700 leading-relaxed">{parsedAnalysis.nextSteps}</p>
              </div>
            )}
          </div>
        )}

        {!analysis && !loading && !error && (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Ready for AI Analysis</h4>
            <p className="text-gray-600 mb-4">
              Get intelligent insights and prioritized recommendations for your accessibility violations.
            </p>
            <button
              onClick={fetchAnalysis}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
            >
              <Brain className="h-4 w-4 mr-2" />
              Generate AI Analysis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Main ScanResults Component
export default function ScanResults({ scanId, onBack }) {
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState(null);
  const [violations, setViolations] = useState([]);
  const [error, setError] = useState('');
  const [fallbackScans, setFallbackScans] = useState([]);
  const [showFallback, setShowFallback] = useState(false);
  
  // Interactive filtering state
  const [selectedFilter, setSelectedFilter] = useState(null);

  // ✅ Auth token for Alt Text AI (you may need to get this from your auth context)
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    // ✅ Get auth token from localStorage or your auth context
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    setAuthToken(token);
  }, []);

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

  // ✅ ENTERPRISE: Support unknown impact values
  const breakdown = useMemo(() => {
    const result = { critical: 0, serious: 0, moderate: 0, minor: 0, unknown: 0 };
    
    for (const violation of violations) {
      const impact = (violation.impact ?? 'minor').toLowerCase();
      if (result.hasOwnProperty(impact)) {
        result[impact]++;
      } else {
        result.unknown++;
      }
    }
    
    return result;
  }, [violations]);

  // Memoized filtered violations
  const filteredViolations = useMemo(() => {
    if (!selectedFilter) return violations;
    
    return violations.filter(violation => {
      const impact = (violation.impact ?? 'minor').toLowerCase();
      return impact === selectedFilter || (selectedFilter === 'unknown' && !['critical', 'serious', 'moderate', 'minor'].includes(impact));
    });
  }, [violations, selectedFilter]);

  // ✅ ENTERPRISE: Render breakdown card with proper accessibility
  const renderBreakdownCard = (severity, icon, label, description, colorClass) => {
    const count = breakdown[severity];
    const isSelected = selectedFilter === severity;
    const isDisabled = count === 0;
    
    return (
      <button
        key={severity}
        onClick={() => {
          if (isDisabled) return;
          setSelectedFilter(isSelected ? null : severity);
        }}
        disabled={isDisabled}
        className={`
          relative p-4 rounded-lg border-2 transition-all duration-200 text-left w-full
          ${isSelected 
            ? `${colorClass.replace('text-', 'border-').replace('-600', '-500')} bg-opacity-10 ${colorClass.replace('-600', '-50')}` 
            : 'border-gray-200 hover:border-gray-300'
          }
          ${isDisabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:shadow-md cursor-pointer'
          }
        `}
        aria-pressed={isSelected}
        aria-describedby={`${severity}-description`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {React.createElement(icon, { 
              className: `h-6 w-6 ${isDisabled ? 'text-gray-400' : colorClass}`,
              'aria-hidden': true 
            })}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`text-lg font-semibold ${isDisabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {label}
                </h3>
                {isSelected && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Filtered
                  </span>
                )}
              </div>
              <p id={`${severity}-description`} className={`text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-600'}`}>
                {description}
              </p>
            </div>
          </div>
          <div className={`text-3xl font-bold ${isDisabled ? 'text-gray-400' : colorClass}`}>
            {count}
          </div>
        </div>
        
        {isSelected && (
          <div className="absolute -top-1 -right-1">
            <div className={`w-3 h-3 rounded-full ${colorClass.replace('text-', 'bg-')}`}></div>
          </div>
        )}
      </button>
    );
  };

  // ✅ ENTERPRISE: Comprehensive scan data for Alt Text AI
  const scanData = useMemo(() => {
    if (!meta || !violations.length) return null;
    
    return {
      id: scanId,
      url: meta.url || meta.website_url,
      timestamp: meta.timestamp || meta.created_at,
      violations: violations,
      meta: meta,
      // Extract images from violations for Alt Text AI
      images: violations
        .filter(v => v.id === 'image-alt' || v.help?.toLowerCase().includes('alt'))
        .flatMap(v => v.nodes || [])
        .map(node => ({
          url: node.target?.[0] || '',
          element: node.html || '',
          context: node.failureSummary || ''
        }))
        .filter(img => img.url)
    };
  }, [scanId, meta, violations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Scan Results</h2>
          <p className="text-gray-600">Please wait while we fetch your accessibility scan...</p>
        </div>
      </div>
    );
  }

  if (showFallback) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={onBack}
              className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="text-yellow-800 font-medium">Scan Not Found</p>
              </div>
              <p className="text-yellow-700 mt-1">
                {error || 'The requested scan could not be found. Here are your available scans:'}
              </p>
            </div>
          </div>

          {/* Available Scans */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Your Recent Scans</h2>
              <p className="text-sm text-gray-600 mt-1">
                Select a scan to view its results
              </p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {fallbackScans.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Scans Found</h3>
                  <p className="text-gray-600">
                    You haven't run any scans yet. Start by scanning a website to see results here.
                  </p>
                </div>
              ) : (
                fallbackScans.map((scan) => (
                  <div key={scan.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Globe className="h-5 w-5 text-gray-400" />
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {scan.url || scan.website_url || 'Unknown URL'}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {scan.timestamp ? new Date(scan.timestamp).toLocaleDateString() : 'Unknown date'}
                              </span>
                              {scan.total_violations !== undefined && (
                                <span className="text-xs text-gray-500">
                                  {scan.total_violations} violations
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => window.location.href = `#/scan/${scan.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        View Results
                        <ExternalLink className="h-3 w-3 ml-2" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !showFallback) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scan Results</h1>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center text-gray-600">
                  <Globe className="h-4 w-4 mr-2" />
                  <span className="text-sm">{meta?.url || meta?.website_url || 'Unknown URL'}</span>
                </div>
                {meta?.timestamp && (
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      {new Date(meta.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {selectedFilter ? filteredViolations.length : violations.length}
              </div>
              <div className="text-sm text-gray-600">
                {selectedFilter ? `${selectedFilter} violations` : 'total violations'}
              </div>
            </div>
          </div>
        </div>

        {/* Violation Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {renderBreakdownCard('critical', AlertOctagon, 'Critical', 'Must fix immediately', 'text-red-600')}
          {renderBreakdownCard('serious', AlertTriangle, 'Serious', 'Should fix soon', 'text-orange-600')}
          {renderBreakdownCard('moderate', AlertCircle, 'Moderate', 'Should fix eventually', 'text-yellow-600')}
          {renderBreakdownCard('minor', Info, 'Minor', 'Nice to fix', 'text-blue-600')}
        </div>

        {/* Filter Status */}
        {selectedFilter && (
          <div className="mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Eye className="h-5 w-5 text-blue-600" />
                  <span className="text-blue-800 font-medium">
                    Showing {filteredViolations.length} {selectedFilter} violations
                  </span>
                </div>
                <button
                  onClick={() => setSelectedFilter(null)}
                  className="inline-flex items-center px-3 py-1 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  <X className="h-4 w-4 mr-1" />
                  Show All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ Alt Text AI Section - NEW INTEGRATION */}
        {scanData && authToken && (
          <div className="mb-8">
            <AltTextAISection 
              scanId={scanId}
              scanData={scanData}
              authToken={authToken}
            />
          </div>
        )}

        {/* AI Analysis Section */}
        <div className="mb-8">
          <AIAnalysis 
            scanId={scanId} 
            violations={filteredViolations} 
            meta={meta} 
          />
        </div>

        {/* Violations List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                {selectedFilter ? `${selectedFilter.charAt(0).toUpperCase() + selectedFilter.slice(1)} Violations` : 'All Violations'}
              </h2>
              <span className="text-sm text-gray-600">
                {filteredViolations.length} of {violations.length} violations
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {filteredViolations.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {selectedFilter ? `No ${selectedFilter} violations found` : 'No violations found'}
                </h3>
                <p className="text-gray-600">
                  {selectedFilter 
                    ? `This scan doesn't have any ${selectedFilter} level violations.`
                    : 'This website appears to be fully accessible!'
                  }
                </p>
              </div>
            ) : (
              filteredViolations.map((violation, index) => (
                <ViolationItem key={`${violation.id}-${index}`} violation={violation} />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ ENTERPRISE: Enhanced ViolationItem component
function ViolationItem({ violation }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getImpactIcon = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'critical': return AlertOctagon;
      case 'serious': return AlertTriangle;
      case 'moderate': return AlertCircle;
      case 'minor': return Info;
      default: return HelpCircle;
    }
  };

  const getImpactColor = (impact) => {
    switch (impact?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'serious': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'minor': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const ImpactIcon = getImpactIcon(violation.impact);
  const impactColor = getImpactColor(violation.impact);
  const nodeCount = violation.nodes?.length || 0;

  return (
    <div className="px-6 py-4">
      <div className="flex items-start space-x-4">
        <div className={`flex-shrink-0 p-2 rounded-lg border ${impactColor}`}>
          <ImpactIcon className="h-5 w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {violation.help || violation.description || 'Accessibility Issue'}
              </h3>
              
              <div className="flex items-center space-x-4 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${impactColor}`}>
                  {violation.impact || 'unknown'}
                </span>
                
                {nodeCount > 0 && (
                  <span className="text-sm text-gray-600">
                    {nodeCount} element{nodeCount !== 1 ? 's' : ''} affected
                  </span>
                )}
                
                {violation.tags && violation.tags.length > 0 && (
                  <div className="flex items-center space-x-1">
                    {violation.tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {tag}
                      </span>
                    ))}
                    {violation.tags.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{violation.tags.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              <p className="text-gray-700 mb-3">
                {violation.description || 'No description available'}
              </p>
              
              {violation.helpUrl && (
                <a
                  href={violation.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-500 text-sm"
                >
                  Learn more about this issue
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </div>
            
            {nodeCount > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="ml-4 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                {isExpanded ? 'Hide' : 'Show'} Elements ({nodeCount})
                <ArrowRight className={`h-4 w-4 ml-2 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </button>
            )}
          </div>
          
          {/* Expanded node details */}
          {isExpanded && violation.nodes && violation.nodes.length > 0 && (
            <div className="mt-4 border-t border-gray-200 pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Affected Elements:</h4>
              <div className="space-y-3">
                {violation.nodes.map((node, nodeIndex) => (
                  <div key={nodeIndex} className="bg-gray-50 rounded-lg p-3">
                    {node.html && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">HTML:</span>
                        <pre className="mt-1 text-xs text-gray-800 bg-white p-2 rounded border overflow-x-auto">
                          {node.html}
                        </pre>
                      </div>
                    )}
                    
                    {node.target && node.target.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Selector:</span>
                        <code className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {node.target[0]}
                        </code>
                      </div>
                    )}
                    
                    {node.failureSummary && (
                      <div>
                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">Issue:</span>
                        <p className="mt-1 text-sm text-gray-800">{node.failureSummary}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ✅ ENTERPRISE: Helper function for fetching scan metadata
async function fetchScanMeta(scanId) {
  try {
    // Try to get scan metadata from your API
    const response = await fetch(`/api/scans/${scanId}/meta`);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.log('Could not fetch scan meta:', e.message);
  }
  
  // Return minimal metadata if API call fails
  return {
    url: 'Unknown URL',
    timestamp: new Date().toISOString(),
    compliance_score: 0
  };
}
