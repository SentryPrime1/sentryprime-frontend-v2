import React, { useState, useEffect } from 'react';
import { auth } from './utils/api';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      if (auth.isAuthenticated()) {
        const currentUser = auth.getCurrentUser();
        setUser(currentUser);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Handle successful login
  const handleLogin = (userData) => {
    setUser(userData);
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout();
    setUser(null);
  };

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SentryPrime...</p>
        </div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  // Show dashboard if logged in
  return <Dashboard user={user} onLogout={handleLogout} />;
}

export default App;
