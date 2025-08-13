import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  X, 
  Lightbulb, 
  Code, 
  CheckCircle, 
  AlertTriangle,
  Loader,
  Sparkles,
  BookOpen,
  Target,
  Zap
} from 'lucide-react';
import { scanning } from '../utils/api';

function AIAnalysis({ scan, onClose }) {
  const [aiResults, setAiResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);

  useEffect(() => {
    if (scan) {
      loadAIAnalysis();
    }
  }, [scan]);

  const loadAIAnalysis = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Call the AI-enhanced scanning endpoint
      const response = await scanning.getAIAnalysis(scan.url || scan.website_url);
      setAiResults(response);
    } catch (err) {
      setError(err.message || 'Failed to load AI analysis');
    } finally {
      setLoading(false);
    }
  };

  // Mock AI recommendations for demo (replace with real API data)
  const mockAIRecommendations = [
    {
      id: 1,
      violation: 'Missing Alt Text',
      severity: 'critical',
      aiRecommendation: {
        whatItIs: "Alt text (alternative text) is a description of an image that screen readers use to convey the image's content to visually impaired users.",
        whyItMatters: "Without alt text, screen reader users miss important visual information. This creates barriers for approximately 285 million visually impaired people worldwide.",
        howToFix: "Add descriptive alt attributes to all images. For decorative images, use alt='' (empty alt text).",
        codeExample: {
          before: '<img src="/hero-image.jpg" class="w-full h-96">',
          after: '<img src="/hero-image.jpg" alt="Team of diverse professionals collaborating in modern office" class="w-full h-96">'
        },
        priority: 'high',
        estimatedTime: '5 minutes',
        wcagReference: 'WCAG 2.1 Success Criterion 1.1.1 Non-text Content'
      }
    },
    {
      id: 2,
      violation: 'Low Color Contrast',
      severity: 'serious',
      aiRecommendation: {
        whatItIs: "Color contrast refers to the difference in luminance between text and its background. Low contrast makes text difficult to read.",
        whyItMatters: "Poor contrast affects users with visual impairments, color blindness, and anyone using devices in bright sunlight. It impacts 8% of men and 0.5% of women with color vision deficiency.",
        howToFix: "Ensure text has a contrast ratio of at least 4.5:1 for normal text and 3:1 for large text against its background.",
        codeExample: {
          before: '<p class="text-gray-400 bg-gray-300">Contact information</p>',
          after: '<p class="text-gray-800 bg-gray-100">Contact information</p>'
        },
        priority: 'medium',
        estimatedTime: '10 minutes',
        wcagReference: 'WCAG 2.1 Success Criterion 1.4.3 Contrast (Minimum)'
      }
    },
    {
      id: 3,
      violation: 'Missing Form Labels',
      severity: 'critical',
      aiRecommendation: {
        whatItIs: "Form labels provide accessible names for form controls, helping users understand what information is expected.",
        whyItMatters: "Without proper labels, screen reader users cannot understand what each form field is for, making forms completely unusable for many disabled users.",
        howToFix: "Associate every form control with a descriptive label using the 'for' attribute or by wrapping the control in a label element.",
        codeExample: {
          before: '<input type="email" placeholder="Enter your email">',
          after: '<label for="email">Email Address</label>\n<input type="email" id="email" placeholder="Enter your email">'
        },
        priority: 'high',
        estimatedTime: '3 minutes',
        wcagReference: 'WCAG 2.1 Success Criterion 1.3.1 Info and Relationships'
      }
    }
  ];

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-100 border-green-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return Target;
      case 'low': return CheckCircle;
      default: return Lightbulb;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">AI-Powered Accessibility Analysis</h2>
                <p className="text-gray-600">Intelligent recommendations for {scan?.website_name || scan?.url}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">AI is analyzing accessibility issues...</p>
                <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <p className="text-red-800 font-medium">AI Analysis Failed</p>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
                <button
                  onClick={loadAIAnalysis}
                  className="btn-primary mt-3"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              {/* AI Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
                <div className="flex items-center space-x-2 mb-3">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  <h3 className="text-lg font-medium text-gray-900">AI Summary</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  I've analyzed your website and found <strong>{mockAIRecommendations.length} accessibility issues</strong> that need attention. 
                  The most critical issues involve missing alt text and form labels, which significantly impact screen reader users. 
                  I've prioritized these recommendations based on user impact and implementation effort.
                </p>
              </div>

              {/* Recommendations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {mockAIRecommendations.map((item) => {
                  const PriorityIcon = getPriorityIcon(item.aiRecommendation.priority);
                  
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg border ${getPriorityColor(item.aiRecommendation.priority)}`}>
                            <PriorityIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{item.violation}</h4>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(item.aiRecommendation.priority)}`}>
                              {item.aiRecommendation.priority} priority
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Zap className="h-3 w-3" />
                            <span>{item.aiRecommendation.estimatedTime}</span>
                          </div>
                        </div>
                      </div>

                      {/* What it is */}
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          <h5 className="font-medium text-gray-900">What it is</h5>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {item.aiRecommendation.whatItIs}
                        </p>
                      </div>

                      {/* Why it matters */}
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target className="h-4 w-4 text-orange-600" />
                          <h5 className="font-medium text-gray-900">Why it matters</h5>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {item.aiRecommendation.whyItMatters}
                        </p>
                      </div>

                      {/* How to fix */}
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Lightbulb className="h-4 w-4 text-green-600" />
                          <h5 className="font-medium text-gray-900">How to fix</h5>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">
                          {item.aiRecommendation.howToFix}
                        </p>
                        
                        {/* Code Example */}
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <Code className="h-3 w-3 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">Code Example</span>
                          </div>
                          
                          <div className="space-y-2">
                            <div>
                              <div className="text-xs text-red-600 font-medium mb-1">❌ Before:</div>
                              <code className="text-xs bg-red-50 text-red-800 p-2 rounded block overflow-x-auto">
                                {item.aiRecommendation.codeExample.before}
                              </code>
                            </div>
                            
                            <div>
                              <div className="text-xs text-green-600 font-medium mb-1">✅ After:</div>
                              <code className="text-xs bg-green-50 text-green-800 p-2 rounded block overflow-x-auto">
                                {item.aiRecommendation.codeExample.after}
                              </code>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* WCAG Reference */}
                      <div className="text-xs text-gray-500 border-t border-gray-200 pt-3">
                        <strong>WCAG Reference:</strong> {item.aiRecommendation.wcagReference}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex justify-center space-x-4">
                <button
                  onClick={loadAIAnalysis}
                  className="btn-outline flex items-center space-x-2"
                >
                  <Brain className="h-4 w-4" />
                  <span>Refresh Analysis</span>
                </button>
                <button
                  onClick={onClose}
                  className="btn-primary"
                >
                  Close Analysis
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AIAnalysis;
