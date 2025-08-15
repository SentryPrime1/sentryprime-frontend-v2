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
  Users
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
  const [selectedScanId, setSelectedScanId] = useState(null); // ✅ FIXED: Store only scan ID
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
      setRecentScans(scansData); // ✅ FIXED: Store full scan list
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
    loadDashboardData(); // ✅ FIXED: Refresh to get new scan with backend ID
  };

  const handleViewScan = (scan) => {
    // ✅ FIXED: Store only scan ID, not full object
    setSelectedScanId(scan.id);
    setActiveTab('results');
  };

  const handleViewAIAnalysis = (scan) => {
    setSelectedScanId(scan.id); // ✅ FIXED: Use scan ID for AI analysis too
    setShowAIAnalysis(true);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'websites', label: 'Websites', icon: Globe },
    { id: 'results', label: 'Scan Results', icon: Scan },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">SentryPrime</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, <span className="font-medium">{user.firstName}</span>
              </div>
              <button
                onClick={onLogout}
                className="btn-outline flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Globe className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Websites</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalWebsites}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Scan className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Scans</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalScans}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <TrendingUp className="h-8 w-8 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Avg Compliance</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.avgCompliance}%</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-content">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Issues</p>
                      <p className="text-2xl font-semibold text-gray-900">{stats.totalViolations}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Websites */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Recent Websites</h3>
                </div>
                <div className="card-content">
                  {userWebsites.length > 0 ? (
                    <div className="space-y-3">
                      {userWebsites.slice(0, 5).map((website) => (
                        <div key={website.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{website.name || website.url}</p>
                            <p className="text-sm text-gray-500">{website.url}</p>
                          </div>
                          <div className="text-right">
                            {website.compliance_score !== null ? (
                              <span className={`badge ${
                                website.compliance_score >= 80 ? 'badge-success' : 
                                website.compliance_score >= 60 ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {website.compliance_score}%
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">Not scanned</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No websites added yet</p>
                      <button
                        onClick={() => setActiveTab('websites')}
                        className="btn-primary mt-2"
                      >
                        Add Your First Website
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Scans */}
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-medium text-gray-900">Recent Scans</h3>
                </div>
                <div className="card-content">
                  {recentScans.length > 0 ? (
                    <div className="space-y-3">
                      {recentScans.slice(0, 5).map((scan) => (
                        <div key={scan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{scan.website_name}</p>
                            <p className="text-sm text-gray-500">
                              {scan.scan_date ? new Date(scan.scan_date).toLocaleDateString() : 'Unknown date'}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="badge badge-success">
                              {scan.total_violations || 0} issues
                            </span>
                            <button
                              onClick={() => handleViewScan(scan)}
                              className="btn-outline text-xs"
                            >
                              View Results
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No scans performed yet</p>
                      <button
                        onClick={() => setActiveTab('websites')}
                        className="btn-primary mt-2"
                      >
                        Start Your First Scan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'websites' && (
  <WebsiteManager 
    onWebsiteAdded={handleWebsiteAdded}
    onScanStarted={handleScanStarted}
    onViewResults={handleViewScan}
  />
)}


        {/* ✅ FIXED: Pass only scanId and proper onBack handler */}
        {activeTab === 'results' && selectedScanId && (
          <ScanResults 
            scanId={selectedScanId}
            onBack={() => {
              setSelectedScanId(null);
              setActiveTab('websites');
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
