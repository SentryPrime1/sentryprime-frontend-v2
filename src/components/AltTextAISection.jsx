// Alt Text AI Section Component
// Main interface for Alt Text AI functionality in scan results

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Image, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertCircle,
  Download,
  Eye,
  Loader2,
  Sparkles,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import altTextAIService from '../services/altTextAIService.js';

const AltTextAISection = ({ scanId, scanData, authToken }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResults, setJobResults] = useState(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [error, setError] = useState(null);
  const [pollingInterval, setPollingInterval] = useState(null);

  // Initialize service with auth token
  useEffect(() => {
    if (authToken) {
      altTextAIService.setAuthToken(authToken);
    }
  }, [authToken]);

  // Load existing job for this scan
  useEffect(() => {
    if (scanId && authToken) {
      loadExistingJob();
      loadEstimate();
    }
  }, [scanId, authToken]);

  // Polling for job progress
  useEffect(() => {
    if (currentJob && (currentJob.status === 'running' || currentJob.status === 'processing')) {
      const interval = setInterval(async () => {
        try {
          const updatedJob = await altTextAIService.getJobStatus(currentJob.jobId);
          setCurrentJob(updatedJob);

          if (updatedJob.status === 'completed') {
            const results = await altTextAIService.getJobResults(updatedJob.jobId);
            setJobResults(results);
            clearInterval(interval);
          } else if (updatedJob.status === 'failed' || updatedJob.status === 'cancelled') {
            clearInterval(interval);
          }
        } catch (error) {
          console.error('Failed to poll job status:', error);
          clearInterval(interval);
        }
      }, 2000);

      setPollingInterval(interval);
      return () => clearInterval(interval);
    }
  }, [currentJob]);

  const loadExistingJob = async () => {
    try {
      const jobs = await altTextAIService.listJobs({ scanId, limit: 1 });
      if (jobs.length > 0) {
        const job = jobs[0];
        setCurrentJob(job);

        if (job.status === 'completed') {
          const results = await altTextAIService.getJobResults(job.jobId);
          setJobResults(results);
        }
      }
    } catch (error) {
      console.error('Failed to load existing job:', error);
    }
  };

  const loadEstimate = async () => {
    try {
      const estimateData = await altTextAIService.getEstimate(scanId);
      setEstimate(estimateData);
    } catch (error) {
      console.error('Failed to load estimate:', error);
    }
  };

  const handleCreateJob = async () => {
    if (!scanData?.url) {
      setError('Scan data not available');
      return;
    }

    setIsCreatingJob(true);
    setError(null);

    try {
      const job = await altTextAIService.createJob(
        scanId,
        scanData.url,
        {
          includeDecorative: true,
          maxConcurrency: 3,
          priority: 'normal'
        }
      );

      setCurrentJob(job);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsCreatingJob(false);
    }
  };

  const handleCancelJob = async () => {
    if (!currentJob) return;

    try {
      await altTextAIService.cancelJob(currentJob.jobId);
      setCurrentJob({ ...currentJob, status: 'cancelled' });
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    } catch (error) {
      setError(error.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      case 'running':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'running':
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return 'Unknown';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.ceil(minutes / 60);
    return `${hours}h`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Alt Text AI
              </h3>
              <p className="text-sm text-gray-600">
                Generate AI-powered alt text for images
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {currentJob && (
              <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentJob.status)}`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(currentJob.status)}
                  <span className="capitalize">{currentJob.status}</span>
                </div>
              </div>
            )}
            
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
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* Estimate Display */}
          {estimate && !currentJob && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Processing Estimate</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Image className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">
                    {estimate.imageCount} images
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">
                    ~{formatDuration(estimate.time?.estimated)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-blue-700">
                    ${estimate.cost?.estimatedCost || '0.00'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* No Job State */}
          {!currentJob && (
            <div className="text-center py-8">
              <div className="p-3 bg-purple-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Ready to Generate Alt Text
              </h4>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                Use AI to automatically generate descriptive alt text for all images in your scan results.
              </p>
              <button
                onClick={handleCreateJob}
                disabled={isCreatingJob || !estimate}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreatingJob ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Starting...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Play className="w-4 h-4" />
                    <span>Start Alt Text Generation</span>
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Job Progress */}
          {currentJob && (currentJob.status === 'running' || currentJob.status === 'processing') && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Processing Images</h4>
                <button
                  onClick={handleCancelJob}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-700 transition-colors"
                >
                  Cancel
                </button>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{currentJob.processedImages || 0} of {currentJob.totalImages || 0} images</span>
                  <span>{currentJob.progress || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${currentJob.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Processing Stats */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-gray-700">
                    {currentJob.processedImages || 0} completed
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700">
                    {currentJob.estimatedTimeRemaining ? 
                      `${formatDuration(currentJob.estimatedTimeRemaining)} remaining` : 
                      'Calculating...'
                    }
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Job Completed */}
          {currentJob && currentJob.status === 'completed' && jobResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Alt Text Generated Successfully</h4>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-green-700">Complete</span>
                </div>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {jobResults.totalSuggestions || 0}
                  </div>
                  <div className="text-sm text-green-600">Suggestions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {jobResults.imagesProcessed || 0}
                  </div>
                  <div className="text-sm text-green-600">Images</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-700">
                    {Math.round((jobResults.averageConfidence || 0) * 100)}%
                  </div>
                  <div className="text-sm text-green-600">Avg Confidence</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                  <div className="flex items-center justify-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>View Suggestions</span>
                  </div>
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Export</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Job Failed */}
          {currentJob && currentJob.status === 'failed' && (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <h4 className="font-medium text-red-900">Job Failed</h4>
                </div>
                <p className="text-sm text-red-700">
                  {currentJob.errorMessage || 'An error occurred while processing images.'}
                </p>
              </div>
              
              <button
                onClick={() => {
                  setCurrentJob(null);
                  setJobResults(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Job Cancelled */}
          {currentJob && currentJob.status === 'cancelled' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <XCircle className="w-5 h-5 text-gray-500" />
                  <h4 className="font-medium text-gray-900">Job Cancelled</h4>
                </div>
                <p className="text-sm text-gray-700">
                  The Alt Text AI job was cancelled before completion.
                </p>
              </div>
              
              <button
                onClick={() => {
                  setCurrentJob(null);
                  setJobResults(null);
                  setError(null);
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Start New Job
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AltTextAISection;
