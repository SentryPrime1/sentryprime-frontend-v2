import React, { useEffect, useState } from 'react';
import { scanning, makeRequest } from '../utils/api';

const ScanResults = ({ scanId }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Alt Text AI State
  const [showAltTextModal, setShowAltTextModal] = useState(false);
  const [altTextEstimate, setAltTextEstimate] = useState(null);
  const [altTextJob, setAltTextJob] = useState(null);
  const [altTextLoading, setAltTextLoading] = useState(false);
  const [altTextResults, setAltTextResults] = useState(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        console.log(`🔍 Fetching results for scan ${scanId}`);
        const data = await scanning.getScanResults(scanId);
        console.log('📊 Received scan results:', data);
        setResults(data);
      } catch (err) {
        console.error('❌ Error loading scan results:', err);
        setError('Failed to load scan results');
      } finally {
        setLoading(false);
      }
    };

    if (scanId) {
      fetchResults();
    }
  }, [scanId]);

  // Alt Text AI Functions - FIXED to use makeRequest
  const handleGenerateAltText = async () => {
    try {
      setAltTextLoading(true);
      console.log('🤖 Getting Alt Text AI estimate for scan:', scanId);
      
      // Get cost estimate using makeRequest
      const estimate = await makeRequest('/api/alt-text-ai/estimate', {
        method: 'POST',
        body: JSON.stringify({ scan_id: scanId })
      });

      console.log('💰 Alt Text AI estimate:', estimate);
      setAltTextEstimate(estimate);
      setShowAltTextModal(true);
    } catch (error) {
      console.error('❌ Alt Text AI estimate failed:', error);
      alert('Failed to get Alt Text AI estimate. Please try again.');
    } finally {
      setAltTextLoading(false);
    }
  };

  const handleCreateAltTextJob = async () => {
    try {
      setAltTextLoading(true);
      console.log('🚀 Creating Alt Text AI job for scan:', scanId);

      const job = await makeRequest('/api/alt-text-ai/jobs', {
        method: 'POST',
        body: JSON.stringify({ scan_id: scanId })
      });

      console.log('✅ Alt Text AI job created:', job);
      setAltTextJob(job);
      setShowAltTextModal(false);
      
      // Start polling for job completion
      pollAltTextJob(job.jobId);
    } catch (error) {
      console.error('❌ Alt Text AI job creation failed:', error);
      alert('Failed to create Alt Text AI job. Please try again.');
    } finally {
      setAltTextLoading(false);
    }
  };

  const pollAltTextJob = async (jobId) => {
    const maxAttempts = 30; // 1 minute max
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        console.log(`🔄 Polling Alt Text AI job ${jobId} (attempt ${attempts})`);

        const jobStatus = await makeRequest(`/api/alt-text-ai/jobs/${jobId}`);
        console.log('📊 Alt Text AI job status:', jobStatus);

        if (jobStatus.status === 'completed') {
          console.log('🎉 Alt Text AI job completed!');
          setAltTextResults(jobStatus.results);
          setAltTextJob(jobStatus);
          return;
        }

        if (jobStatus.status === 'failed') {
          console.error('❌ Alt Text AI job failed');
          alert('Alt Text AI processing failed. Please try again.');
          return;
        }

        // Update job progress
        setAltTextJob(jobStatus);

        // Continue polling if not complete and under max attempts
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Poll every 2 seconds
        } else {
          console.error('⏰ Alt Text AI job polling timeout');
          alert('Alt Text AI processing is taking longer than expected. Please check back later.');
        }
      } catch (error) {
        console.error('❌ Alt Text AI job polling error:', error);
        if (attempts < maxAttempts) {
          setTimeout(poll, 2000); // Retry on error
        }
      }
    };

    poll();
  };

  const handleLearnMore = () => {
    // Open learn more modal or navigate to documentation
    alert('Alt Text AI uses advanced computer vision to analyze images and generate descriptive, accessible alt text that helps screen readers provide better descriptions for visually impaired users.');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Scan Results...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we fetch your accessibility report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2">
          <div className="text-red-600">⚠️</div>
          <h3 className="text-red-800 font-medium">Error Loading Results</h3>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No results found.</p>
      </div>
    );
  }

  // ✅ ENTERPRISE FIX: Extract data matching backend response format
  const {
    scanId: resultScanId,
    websiteName,
    url,
    scanDate,
    completionDate,
    totalViolations = 0,
    complianceScore = 0,
    pagesScanned = 0,
    results: scanResults
  } = results;

  // ✅ Parse the nested results object if it exists
  const {
    totalPages = pagesScanned,
    byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 },
    pages = [],
    violations = totalViolations
  } = scanResults || {};

  // ✅ Extract violations array from pages if available
  const allViolations = pages.reduce((acc, page) => {
    return acc.concat(page.violations || []);
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Accessibility Scan Results</h2>
        {websiteName && (
          <p className="text-gray-600 mt-1">
            <span className="font-medium">{websiteName}</span> • {url}
          </p>
        )}
        {scanDate && (
          <p className="text-sm text-gray-500 mt-1">
            Scanned on {new Date(scanDate).toLocaleDateString()} at {new Date(scanDate).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Compliance Score</h3>
          <p className="text-3xl font-bold mt-2">{complianceScore}%</p>
          <p className="text-blue-100 text-sm mt-1">WCAG 2.1 AA</p>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Pages Scanned</h3>
          <p className="text-3xl font-bold mt-2">{totalPages}</p>
          <p className="text-green-100 text-sm mt-1">Successfully analyzed</p>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Total Issues</h3>
          <p className="text-3xl font-bold mt-2">{violations}</p>
          <p className="text-red-100 text-sm mt-1">Accessibility violations</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium">Status</h3>
          <p className="text-2xl font-bold mt-2">Complete</p>
          <p className="text-purple-100 text-sm mt-1">Analysis finished</p>
        </div>
      </div>

      {/* Accessibility Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Accessibility Breakdown</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{byImpact.critical || 0}</div>
            <div className="text-sm text-red-700">Critical</div>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{byImpact.serious || 0}</div>
            <div className="text-sm text-orange-700">Serious</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{byImpact.moderate || 0}</div>
            <div className="text-sm text-yellow-700">Moderate</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{byImpact.minor || 0}</div>
            <div className="text-sm text-blue-700">Minor</div>
          </div>
        </div>

        {/* Violations Table */}
        {allViolations.length > 0 ? (
          <div className="overflow-x-auto">
            <h4 className="text-lg font-medium mb-3">Issues Found</h4>
            <table className="w-full text-left border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 border-b border-gray-200 font-medium text-gray-700">Issue</th>
                  <th className="p-3 border-b border-gray-200 font-medium text-gray-700">Impact</th>
                  <th className="p-3 border-b border-gray-200 font-medium text-gray-700">Description</th>
                  <th className="p-3 border-b border-gray-200 font-medium text-gray-700">Help</th>
                </tr>
              </thead>
              <tbody>
                {allViolations.slice(0, 10).map((violation, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 border-b border-gray-200">
                      <span className="font-medium text-gray-900">{violation.id || 'Unknown Issue'}</span>
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        violation.impact === 'critical' ? 'bg-red-100 text-red-800' :
                        violation.impact === 'serious' ? 'bg-orange-100 text-orange-800' :
                        violation.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {violation.impact || 'minor'}
                      </span>
                    </td>
                    <td className="p-3 border-b border-gray-200 text-gray-600">
                      {violation.description || 'No description available'}
                    </td>
                    <td className="p-3 border-b border-gray-200">
                      {violation.helpUrl ? (
                        <a 
                          href={violation.helpUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Learn more →
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">No help available</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {allViolations.length > 10 && (
              <p className="text-sm text-gray-500 mt-3">
                Showing first 10 of {allViolations.length} issues. Full report available in detailed view.
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-green-600 text-4xl mb-2">✅</div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Issues Found!</h4>
            <p className="text-gray-600">This website appears to meet accessibility standards.</p>
          </div>
        )}
      </div>

      {/* Alt Text AI Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <span className="text-purple-600 text-xl">🤖</span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Alt Text AI</h3>
            <p className="text-gray-600">AI-powered alt text generation for your images</p>
          </div>
        </div>
        
        {altTextJob ? (
          <div className="space-y-4">
            {altTextJob.status === 'processing' ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="font-medium text-blue-800">Processing Images...</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${altTextJob.progress || 0}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700 mt-2">
                  {altTextJob.processedImages || 0} of {altTextJob.totalImages || 0} images processed
                </p>
              </div>
            ) : altTextJob.status === 'completed' && altTextResults ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-green-600 text-lg">✅</span>
                  <span className="font-medium text-green-800">Alt Text Generation Complete!</span>
                </div>
                <p className="text-green-700 mb-3">
                  Generated alt text for {altTextResults.summary?.totalProcessed || 0} images
                </p>
                <button 
                  onClick={() => setShowAltTextModal(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  View Suggestions
                </button>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <span className="text-red-800">Alt Text AI processing failed. Please try again.</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-700">
              Automatically generate descriptive alt text for images on your website using advanced AI vision technology.
            </p>
            
            <div className="flex space-x-3">
              <button 
                onClick={handleGenerateAltText}
                disabled={altTextLoading}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {altTextLoading ? (
                  <span className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Getting Estimate...</span>
                  </span>
                ) : (
                  'Generate AI Alt Text'
                )}
              </button>
              
              <button 
                onClick={handleLearnMore}
                className="px-6 py-3 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors font-medium"
              >
                Learn More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Alt Text AI Estimate Modal */}
      {showAltTextModal && altTextEstimate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Alt Text AI Estimate</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Total Images:</span>
                <span className="font-medium">{altTextEstimate.totalImages || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Images Without Alt Text:</span>
                <span className="font-medium">{altTextEstimate.imagesWithoutAlt || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Cost:</span>
                <span className="font-medium">${altTextEstimate.estimatedCost || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Time:</span>
                <span className="font-medium">{altTextEstimate.estimatedTime || '0 seconds'}</span>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleCreateAltTextJob}
                disabled={altTextLoading}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {altTextLoading ? 'Creating Job...' : 'Start Processing'}
              </button>
              <button
                onClick={() => setShowAltTextModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanResults;
