import { useState, useEffect, useRef } from 'react';
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

      if (currentSection === 'priorities' && trimmed.match(/^\d+\./) && priorityCount < 3) {
        sections.priorities.push(trimmed.replace(/^\d+\.\s*/, ''));
        priorityCount++;
      } else if (currentSection !== 'priorities' && trimmed.length > 10) {
        if (sections[currentSection]) {
          sections[currentSection] += ' ' + trimmed;
        } else {
          sections[currentSection] = trimmed;
        }
      }
    }

    return sections;
  };

  const parsedAnalysis = analysis?.analysis ? parseAnalysis(analysis.analysis) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
              <p className="text-sm text-gray-600">Intelligent insights and recommendations</p>
            </div>
          </div>
          {analysis && (
            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              <span>Analysis Complete</span>
            </div>
          )}
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
    const token = localStorage.getItem('sentryprime_token') || localStorage.getItem('token');
    setAuthToken(token);
  }, []);

  useEffect(() => {
    if (!scanId) return;
    console.log('ScanResults received scanId:', scanId);

    let cancelled = false;

    const fetchMeta = async () => {
      try {
        const r = await scanning.getScanMeta(scanId);
        if (!cancelled) setMeta(r);
      } catch (e) {
        console.error('Failed to fetch scan meta:', e);
      }
    };

    const fetchResultsWithPolling = async () => {
      // ✅ FIXED: Convert scanId to string before calling startsWith
      if (String(scanId).startsWith('fallback-')) {
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
              if (!cancelled) {
                setError('Unable to load scan results. Please try running a new scan.');
                setLoading(false);
              }
            }
            return;
          }
        }

        if (i < 14) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      if (!cancelled) {
        setError('Scan results are taking longer than expected. Please try again later.');
        setLoading(false);
      }
    };

    fetchMeta();
    fetchResultsWithPolling();

    return () => {
      cancelled = true;
    };
  }, [scanId]);

  // Filter violations by impact level
  const filteredViolations = selectedFilter 
    ? violations.filter(v => v.impact === selectedFilter)
    : violations;

  // Group violations by impact for summary
  const violationsByImpact = violations.reduce((acc, violation) => {
    const impact = violation.impact || 'unknown';
    acc[impact] = (acc[impact] || 0) + 1;
    return acc;
  }, {});

  const impactColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    serious: 'bg-orange-100 text-orange-800 border-orange-200',
    moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    minor: 'bg-blue-100 text-blue-800 border-blue-200',
    unknown: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const impactIcons = {
    critical: AlertOctagon,
    serious: AlertTriangle,
    moderate: AlertCircle,
    minor: Info,
    unknown: HelpCircle
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Scan Results</h2>
          <p className="text-gray-600">Please wait while we fetch your accessibility report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-3">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
            <button
              onClick={onBack}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showFallback) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="text-center mb-6">
              <Eye className="h-12 w-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Available Scan Results</h2>
              <p className="text-gray-600">Choose from your recent scans to view results</p>
            </div>

            {fallbackScans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No scan results available yet.</p>
                <button
                  onClick={onBack}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {fallbackScans.map((scan) => (
                  <div key={scan.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{scan.website_name || scan.url}</h3>
                        <p className="text-sm text-gray-600">{scan.url}</p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(scan.scan_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <BarChart3 className="h-4 w-4 mr-1" />
                            {scan.compliance_score}% compliance
                          </span>
                          <span className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            {scan.total_violations} violations
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setShowFallback(false);
                          setLoading(true);
                          // Trigger a re-fetch with the selected scan ID
                          window.location.hash = `#/scan-results/${scan.id}`;
                          window.location.reload();
                        }}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Results
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Accessibility Scan Results</h1>
                {meta && (
                  <p className="text-sm text-gray-600">
                    <Globe className="h-4 w-4 inline mr-1" />
                    {meta.url}
                  </p>
                )}
              </div>
            </div>
            
            {meta && (
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{meta.compliance_score || 0}%</div>
                  <div className="text-gray-600">Compliance</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{violations.length}</div>
                  <div className="text-gray-600">Violations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{meta.pages_scanned || 1}</div>
                  <div className="text-gray-600">Pages</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Accessibility Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Accessibility Breakdown</h2>
            </div>
            <div className="p-6">
              {violations.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Great Job!</h3>
                  <p className="text-gray-600">No accessibility violations found on this page.</p>
                </div>
              ) : (
                <>
                  {/* Impact Filter Buttons */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <button
                      onClick={() => setSelectedFilter(null)}
                      className={`px-3 py-2 text-sm font-medium rounded-md border ${
                        selectedFilter === null
                          ? 'bg-blue-100 text-blue-800 border-blue-200'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      All ({violations.length})
                    </button>
                    {Object.entries(violationsByImpact).map(([impact, count]) => {
                      const IconComponent = impactIcons[impact] || Info;
                      return (
                        <button
                          key={impact}
                          onClick={() => setSelectedFilter(impact)}
                          className={`px-3 py-2 text-sm font-medium rounded-md border flex items-center space-x-1 ${
                            selectedFilter === impact
                              ? impactColors[impact]
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <IconComponent className="h-4 w-4" />
                          <span className="capitalize">{impact} ({count})</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Violations List */}
                  <div className="space-y-4">
                    {filteredViolations.map((violation, index) => {
                      const IconComponent = impactIcons[violation.impact] || Info;
                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${impactColors[violation.impact] || impactColors.unknown}`}>
                              <IconComponent className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-medium text-gray-900">{violation.description}</h3>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${impactColors[violation.impact] || impactColors.unknown}`}>
                                  {violation.impact}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{violation.help}</p>
                              {violation.helpUrl && (
                                <a
                                  href={violation.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                                >
                                  Learn more
                                  <ExternalLink className="h-4 w-4 ml-1" />
                                </a>
                              )}
                              {violation.pageUrl && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Found on: {violation.pageUrl}
                                </div>
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
          </div>

          {/* ✅ Alt Text AI Section */}
          {authToken && scanId && (
            <AltTextAISection 
              scanId={scanId} 
              authToken={authToken}
            />
          )}

          {/* AI Analysis Section */}
          <AIAnalysis scanId={scanId} violations={violations} meta={meta} />
        </div>
      </div>
    </div>
  );
}
