import React, { useState, useEffect } from 'react';
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
  ArrowLeft
} from 'lucide-react';

function ScanResults({ scan, onViewAIAnalysis }) {
  const [selectedViolation, setSelectedViolation] = useState(null);
  const [showCode, setShowCode] = useState(false);

  // Mock scan results data (in real app, this would come from the scan)
  const mockViolations = [
    {
      id: 1,
      type: 'Missing Alt Text',
      severity: 'critical',
      impact: 'serious',
      description: 'Images must have alternate text',
      help: 'All img elements must have an alt attribute',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/image-alt',
      element: '<img src="/hero-image.jpg" class="w-full h-96 object-cover">',
      selector: 'img.w-full.h-96',
      context: 'Hero section image on homepage',
      wcagLevel: 'AA',
      wcagCriteria: '1.1.1 Non-text Content'
    },
    {
      id: 2,
      type: 'Low Color Contrast',
      severity: 'moderate',
      impact: 'serious',
      description: 'Text and background colors must have sufficient contrast',
      help: 'Elements must have sufficient color contrast',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/color-contrast',
      element: '<p class="text-gray-400 bg-gray-300">Contact us for more information</p>',
      selector: 'p.text-gray-400',
      context: 'Footer contact information',
      wcagLevel: 'AA',
      wcagCriteria: '1.4.3 Contrast (Minimum )'
    },
    {
      id: 3,
      type: 'Missing Form Labels',
      severity: 'critical',
      impact: 'critical',
      description: 'Form elements must have labels',
      help: 'Every form element must have a programmatically associated label',
      helpUrl: 'https://dequeuniversity.com/rules/axe/4.4/label',
      element: '<input type="email" placeholder="Enter your email" class="form-input">',
      selector: 'input[type="email"]',
      context: 'Newsletter signup form',
      wcagLevel: 'A',
      wcagCriteria: '1.3.1 Info and Relationships'
    }
  ];

  const getSeverityColor = (severity ) => {
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

  if (!scan) {
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
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scan Results</h2>
          <p className="text-gray-600 mt-1">Detailed accessibility analysis</p>
        </div>
        <button
          onClick={() => onViewAIAnalysis(scan)}
          className="btn-primary flex items-center space-x-2"
        >
          <Brain className="h-4 w-4" />
          <span>AI Analysis</span>
        </button>
      </div>

      {/* Scan Overview */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <p className="font-medium text-gray-900">{scan.website_name || scan.url}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Scan Date</p>
                <p className="font-medium text-gray-900">
                  {scan.scan_date ? new Date(scan.scan_date).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Compliance Score</p>
                <p className={`font-medium text-2xl ${
                  scan.compliance_score >= 80 ? 'text-green-600' : 
                  scan.compliance_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {scan.compliance_score || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-red-600">{mockViolations.filter(v => v.severity === 'critical').length}</div>
            <div className="text-sm text-gray-600">Critical Issues</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-orange-600">{mockViolations.filter(v => v.severity === 'serious').length}</div>
            <div className="text-sm text-gray-600">Serious Issues</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-yellow-600">{mockViolations.filter(v => v.severity === 'moderate').length}</div>
            <div className="text-sm text-gray-600">Moderate Issues</div>
          </div>
        </div>
        
        <div className="card">
          <div className="card-content text-center">
            <div className="text-2xl font-bold text-gray-600">{mockViolations.length}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
        </div>
      </div>

      {/* Violations List */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">Accessibility Violations</h3>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            {mockViolations.map((violation) => {
              const SeverityIcon = getSeverityIcon(violation.severity);
              
              return (
                <div key={violation.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className={`p-2 rounded-lg border ${getSeverityColor(violation.severity)}`}>
                        <SeverityIcon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-gray-900">{violation.type}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(violation.severity)}`}>
                            {violation.severity}
                          </span>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">{violation.description}</p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>WCAG {violation.wcagLevel}</span>
                          <span>{violation.wcagCriteria}</span>
                          <span>Impact: {violation.impact}</span>
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            <strong>Context:</strong> {violation.context}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedViolation(violation)}
                        className="btn-outline text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </button>
                      
                      <a
                        href={violation.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-outline text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Learn More
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Violation Detail Modal */}
      {selectedViolation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{selectedViolation.type}</h3>
                <button
                  onClick={() => setSelectedViolation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{selectedViolation.description}</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">How to Fix</h4>
                  <p className="text-gray-600">{selectedViolation.help}</p>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">Element Code</h4>
                    <button
                      onClick={() => setShowCode(!showCode)}
                      className="btn-outline text-xs"
                    >
                      <Code className="h-3 w-3 mr-1" />
                      {showCode ? 'Hide' : 'Show'} Code
                    </button>
                  </div>
                  
                  {showCode && (
                    <div className="bg-gray-100 rounded-md p-3">
                      <code className="text-sm text-gray-800 break-all">
                        {selectedViolation.element}
                      </code>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-900">Selector:</span>
                    <p className="text-gray-600">{selectedViolation.selector}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">WCAG Criteria:</span>
                    <p className="text-gray-600">{selectedViolation.wcagCriteria}</p>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <a
                    href={selectedViolation.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary flex items-center space-x-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Learn More</span>
                  </a>
                  <button
                    onClick={() => setSelectedViolation(null)}
                    className="btn-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScanResults;
