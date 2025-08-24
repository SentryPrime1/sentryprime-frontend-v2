import React, { useEffect, useState } from 'react';
import { scanning } from '../utils/api';

const ScanResults = ({ scanId }) => {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

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
        
        <p className="text-gray-700 mb-4">
          Our AI can analyze images on your website and generate descriptive alt text to improve accessibility. 
          This helps screen readers provide better descriptions for visually impaired users.
        </p>
        
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
            Generate AI Alt Text
          </button>
          <button className="px-4 py-2 border border-purple-300 text-purple-700 rounded-lg hover:bg-purple-50 transition-colors">
            Learn More
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4 pt-6">
        <button 
          onClick={() => window.print()} 
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Export Report
        </button>
        <button 
          onClick={() => window.location.href = '/dashboard'} 
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default ScanResults;
