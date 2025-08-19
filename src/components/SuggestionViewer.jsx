// Suggestion Viewer Component
// Display and manage alt text suggestions from AI

import React, { useState, useEffect } from 'react';
import { 
  Image, 
  CheckCircle, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Edit3, 
  Eye, 
  EyeOff,
  Star,
  AlertCircle,
  ExternalLink,
  Zap
} from 'lucide-react';
import altTextAIService from '../services/altTextAIService.js';

const SuggestionViewer = ({ jobResults, onSuggestionSelect }) => {
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Map());
  const [expandedImages, setExpandedImages] = useState(new Set());
  const [customAltText, setCustomAltText] = useState(new Map());
  const [feedback, setFeedback] = useState(new Map());

  // Group suggestions by image
  const imageGroups = jobResults?.suggestions?.reduce((groups, suggestion) => {
    const imageUrl = suggestion.imageUrl;
    if (!groups[imageUrl]) {
      groups[imageUrl] = {
        imageUrl,
        imageInfo: suggestion.imageInfo,
        suggestions: []
      };
    }
    groups[imageUrl].suggestions.push(suggestion);
    return groups;
  }, {}) || {};

  const handleSuggestionSelect = async (imageUrl, suggestionId, altText) => {
    try {
      // Update local state
      setSelectedSuggestions(prev => new Map(prev.set(imageUrl, { suggestionId, altText })));

      // Call API to record selection
      if (onSuggestionSelect) {
        await onSuggestionSelect(suggestionId, altText, feedback.get(suggestionId) || '');
      }

      // Record selection via service
      await altTextAIService.selectSuggestion(
        jobResults.jobId,
        suggestionId,
        altText,
        feedback.get(suggestionId) || ''
      );

    } catch (error) {
      console.error('Failed to select suggestion:', error);
    }
  };

  const handleCustomAltText = (imageUrl, customText) => {
    setCustomAltText(prev => new Map(prev.set(imageUrl, customText)));
    setSelectedSuggestions(prev => new Map(prev.set(imageUrl, { 
      suggestionId: 'custom', 
      altText: customText 
    })));
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const toggleImageExpanded = (imageUrl) => {
    setExpandedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(imageUrl)) {
        newSet.delete(imageUrl);
      } else {
        newSet.add(imageUrl);
      }
      return newSet;
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600 bg-green-100';
    if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const getSuggestionTypeIcon = (type) => {
    switch (type) {
      case 'concise':
        return <Zap className="w-4 h-4" />;
      case 'detailed':
        return <Eye className="w-4 h-4" />;
      case 'brief':
        return <Star className="w-4 h-4" />;
      default:
        return <Image className="w-4 h-4" />;
    }
  };

  const getSuggestionTypeLabel = (type) => {
    switch (type) {
      case 'concise':
        return 'Recommended';
      case 'detailed':
        return 'Detailed';
      case 'brief':
        return 'Brief';
      default:
        return 'General';
    }
  };

  if (!jobResults || !jobResults.suggestions || jobResults.suggestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Available</h3>
        <p className="text-gray-600">No alt text suggestions were generated for this job.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Alt Text Suggestions</h3>
          <p className="text-sm text-gray-600">
            {Object.keys(imageGroups).length} images with {jobResults.suggestions.length} suggestions
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>{selectedSuggestions.size} selected</span>
        </div>
      </div>

      {/* Image Groups */}
      <div className="space-y-4">
        {Object.values(imageGroups).map((group, index) => {
          const isExpanded = expandedImages.has(group.imageUrl);
          const selectedSuggestion = selectedSuggestions.get(group.imageUrl);
          const customText = customAltText.get(group.imageUrl);

          return (
            <div key={group.imageUrl} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Image Header */}
              <div 
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleImageExpanded(group.imageUrl)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {group.imageInfo?.thumbnail ? (
                        <img 
                          src={group.imageInfo.thumbnail} 
                          alt="Image thumbnail"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Image className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    
                    <div>
                      <div className="font-medium text-gray-900">
                        Image {index + 1}
                      </div>
                      <div className="text-sm text-gray-600 truncate max-w-md">
                        {group.imageUrl}
                      </div>
                      {group.imageInfo?.existingAlt && (
                        <div className="text-xs text-orange-600 mt-1">
                          Current: "{group.imageInfo.existingAlt}"
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {selectedSuggestion && (
                      <div className="flex items-center space-x-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Selected</span>
                      </div>
                    )}
                    
                    <div className="text-sm text-gray-500">
                      {group.suggestions.length} suggestions
                    </div>
                    
                    <div className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 space-y-4">
                  {/* Image Details */}
                  {group.imageInfo && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-900">Dimensions:</span>
                          <span className="text-blue-700 ml-2">
                            {group.imageInfo.width}×{group.imageInfo.height}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-blue-900">Size:</span>
                          <span className="text-blue-700 ml-2">
                            {group.imageInfo.fileSize ? 
                              `${Math.round(group.imageInfo.fileSize / 1024)}KB` : 
                              'Unknown'
                            }
                          </span>
                        </div>
                        {group.imageInfo.isDecorative && (
                          <div className="col-span-2">
                            <div className="flex items-center space-x-2">
                              <EyeOff className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-700 text-sm">
                                Detected as decorative image
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Suggestions */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">AI Suggestions</h4>
                    
                    {group.suggestions.map((suggestion) => (
                      <div 
                        key={suggestion.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedSuggestion?.suggestionId === suggestion.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleSuggestionSelect(group.imageUrl, suggestion.id, suggestion.text)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              {getSuggestionTypeIcon(suggestion.type)}
                              <span className="text-sm font-medium text-gray-700">
                                {getSuggestionTypeLabel(suggestion.type)}
                              </span>
                              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                {getConfidenceLabel(suggestion.confidence)} ({Math.round(suggestion.confidence * 100)}%)
                              </div>
                            </div>
                            
                            <p className="text-gray-900 mb-2">
                              "{suggestion.text}"
                            </p>
                            
                            <div className="flex items-center space-x-2 text-xs text-gray-500">
                              <span>{suggestion.text.length} characters</span>
                              {suggestion.text.length > 125 && (
                                <div className="flex items-center space-x-1 text-orange-600">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Long alt text</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(suggestion.text);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="Copy to clipboard"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            
                            {selectedSuggestion?.suggestionId === suggestion.id && (
                              <CheckCircle className="w-5 h-5 text-purple-600" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Custom Alt Text */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">Custom Alt Text</h4>
                    <div className="space-y-2">
                      <textarea
                        value={customText || ''}
                        onChange={(e) => handleCustomAltText(group.imageUrl, e.target.value)}
                        placeholder="Write your own alt text..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        rows={2}
                      />
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{(customText || '').length} characters</span>
                        {customText && customText.length > 125 && (
                          <div className="flex items-center space-x-1 text-orange-600">
                            <AlertCircle className="w-3 h-3" />
                            <span>Consider shorter alt text</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Decorative Option */}
                  <div className="pt-3 border-t border-gray-200">
                    <button
                      onClick={() => handleSuggestionSelect(group.imageUrl, 'decorative', '')}
                      className={`w-full p-3 border rounded-lg text-left transition-all ${
                        selectedSuggestion?.suggestionId === 'decorative'
                          ? 'border-gray-400 bg-gray-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <EyeOff className="w-4 h-4 text-gray-500" />
                          <span className="font-medium text-gray-700">Mark as Decorative</span>
                        </div>
                        {selectedSuggestion?.suggestionId === 'decorative' && (
                          <CheckCircle className="w-5 h-5 text-gray-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 ml-6">
                        This image is decorative and doesn't need alt text (alt="")
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-gray-900">Selection Summary</h4>
            <p className="text-sm text-gray-600">
              {selectedSuggestions.size} of {Object.keys(imageGroups).length} images have alt text selected
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round((selectedSuggestions.size / Object.keys(imageGroups).length) * 100) || 0}%
            </div>
            <div className="text-sm text-gray-600">Complete</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuggestionViewer;
