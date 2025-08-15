import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Globe, 
  BarChart3, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  LogOut,
  Plus,
  Scan,
  Brain,
  TrendingUp,
  Users,
  Eye
} from 'lucide-react';
import { dashboard, websites, scanning } from '../utils/api';
import WebsiteManager from './WebsiteManager';
import ScanResults from './ScanResults';
import AIAnalysis from './AIAnalysis';

function Dashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalWebsites: 0,
    totalScans: 0,
    avgCompliance: 0,
    totalViolations: 0
  });
  const [userWebsites, setUserWebsites] = useState([]);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScanId, setSelectedScanId] = useState(null);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, websitesData, scansData] = await Promise.all([
        dashboard.getStats(),
        dashboard.getWebsites(),
        dashboard.getScans()
      ]);
      
      setStats(statsData);
      setUserWebsites(websitesData);
      setRecentScans(scansData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWebsiteAdded = () => {
    loadDashboardData();
  };

  const handleScanStarted = () => {
    loadDashboardData();
  };

  const handleViewScan = (scanId) => {
    setSelectedScanId(scanId);
    setActiveTab('results');
  };

  const handleViewAIAnalysis = (scanId) => {
    setSelectedScanId(scanId);
    setShowAIAnalysis(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">SentryPrime</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name || 'User'}</span>
              <button
                onClick={onLogout}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-4 w-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('websites')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'websites'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Websites
            </button>
            <button
              onClick={() => setActiveTab('scan-results')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'scan-results'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Scan className="h-4 w-4 inline mr-2" />
              Scan Results
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Globe className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Websites</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalWebsites}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Scan className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Scans</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalScans}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Avg Compliance</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.avgCompliance}%</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Violations</dt>
                        <dd className="text-lg font-medium text-gray-900">{stats.totalViolations}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Websites Tab */}
        {activeTab === 'websites' && (
          <WebsiteManager 
            onWebsiteAdded={handleWebsiteAdded}
            onScanStarted={handleScanStarted}
            onViewResults={handleViewScan}
          />
        )}

        {/* ✅ FIXED: Scan Results Tab with relaxed button condition */}
        {activeTab === 'scan-results' && (
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Recent Scan Results</h3>
                {recentScans.length > 0 ? (
                  <div className="space-y-4">
                    {recentScans.map((scan) => (
                      <div key={scan.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-sm font-medium text-gray-900">{scan.url}</h4>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                scan.status === 'completed' || scan.status === 'done'
                                  ? 'bg-green-100 text-green-800' 
                                  : scan.status === 'running'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {scan.status || 'completed'}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              <span>Compliance: {scan.compliance_score || 0}%</span>
                              <span className="mx-2">•</span>
                              <span>Violations: {scan.total_violations || 0}</span>
                              <span className="mx-2">•</span>
                              <span>Scanned: {scan.created_at ? new Date(scan.created_at).toLocaleString() : 'Unknown'}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* ✅ FIXED: Show buttons if scan has violations (meaning it's completed) */}
                            {(scan.status === 'completed' || scan.status === 'done' || scan.total_violations > 0) && (
                              <>
                                <button
                                  onClick={() => handleViewScan(scan.id)}
                                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Results
                                </button>
                                <button
                                  onClick={() => handleViewAIAnalysis(scan.id)}
                                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  <Brain className="h-4 w-4 mr-1" />
                                  AI Analysis
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No scan results yet</h3>
                    <p className="text-gray-600 mb-4">
                      Start scanning your websites to see detailed accessibility reports here
                    </p>
                    <button
                      onClick={() => setActiveTab('websites')}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Website & Scan
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scan Results Detail View */}
        {activeTab === 'results' && selectedScanId && (
          <ScanResults 
            scanId={selectedScanId}
            onBack={() => {
              setSelectedScanId(null);
              setActiveTab('scan-results');
            }}
          />
        )}
      </main>

      {/* AI Analysis Modal */}
      {showAIAnalysis && selectedScanId && (
        <AIAnalysis 
          scanId={selectedScanId}
          onClose={() => setShowAIAnalysis(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
