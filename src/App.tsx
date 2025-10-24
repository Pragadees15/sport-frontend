import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { AuthCallback } from './pages/AuthCallback';
import { ProfileCompletion } from './pages/ProfileCompletion';
import { IntegrationTest } from './components/debug/IntegrationTest';
import { PublicProfile } from './components/profile/PublicProfile';
import { UserProfile } from './components/profile/UserProfile';
import { HomePage } from './components/home/HomePage';
import { DiscoverPage } from './components/discover/DiscoverPage';
import { NotificationsPage } from './components/modals/notifications/NotificationsPage';
import { MessagesPage } from './components/messaging/MessagesPage';
import { ExpertDashboard } from './components/expert/ExpertDashboard';
import { PlayPage } from './components/play/PlayPage';
import { VerificationPortal } from './pages/VerificationPortal';
import { MapPage } from './components/map/MapPage';
import { PostDetailPage } from './components/posts/PostDetailPage';
import { useAuthStore } from './store/authStore';

function AppContent() {
  const { isAuthenticated, user, checkAuth, isLoading } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // Don't run checkAuth during auth callback to avoid race conditions
    if (location.pathname !== '/auth/callback') {
      checkAuth();
    }
  }, [checkAuth, location.pathname]);


  // Store the current route in localStorage when it changes (only for dashboard routes)
  useEffect(() => {
    if (isAuthenticated && user && location.pathname.startsWith('/dashboard/')) {
      localStorage.setItem('lastDashboardRoute', location.pathname);
    }
  }, [location.pathname, isAuthenticated, user]);

  // Helper function to get a valid dashboard route
  const getValidDashboardRoute = (): string => {
    const lastRoute = localStorage.getItem('lastDashboardRoute');
    const validRoutes = ['/dashboard/home', '/dashboard/discover', '/dashboard/play', '/dashboard/messages', '/dashboard/profile', '/dashboard/notifications', '/dashboard/map'];
    
    // Check if user has access to expert/verification routes
    if (user?.role === 'admin' || user?.role === 'administrator' || user?.role === 'coach') {
      validRoutes.push('/dashboard/expert');
    }
    if (user?.role === 'aspirant' || user?.role === 'coach') {
      validRoutes.push('/dashboard/verification');
    }
    
    // Return last route if it's valid, otherwise default to home
    return (lastRoute && validRoutes.includes(lastRoute)) ? lastRoute : '/dashboard/home';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route
          path="/auth"
          element={
            isAuthenticated ? (
              !user?.role ? <Navigate to="/profile-completion" replace /> : <Navigate to={getValidDashboardRoute()} replace />
            ) : <AuthPage />
          }
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />
        <Route
          path="/profile-completion"
          element={
            isAuthenticated ? <ProfileCompletion /> : <Navigate to="/auth" replace />
          }
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              !user?.role ? <Navigate to="/profile-completion" replace /> : <Dashboard />
            ) : <Navigate to="/auth" replace />
          }
        >
          <Route index element={<Navigate to="/dashboard/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="discover" element={<DiscoverPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="expert" element={
            (user?.role === 'admin' || user?.role === 'administrator' || user?.role === 'coach') ? (
              <ExpertDashboard />
            ) : (
              <Navigate to={getValidDashboardRoute()} replace />
            )
          } />
          <Route path="verification" element={
            (user?.role === 'aspirant' || user?.role === 'coach') ? (
              <VerificationPortal />
            ) : (
              <Navigate to={getValidDashboardRoute()} replace />
            )
          } />
          <Route path="play" element={<PlayPage />} />
          <Route path="map" element={<MapPage />} />
        </Route>

        <Route
          path="/profile/:username"
          element={<PublicProfile />}
        />
        <Route
          path="/post/:id"
          element={<PostDetailPage />}
        />
        <Route
          path="/test"
          element={<IntegrationTest />}
        />
        <Route
          path="/"
          element={
            <Navigate to={
              isAuthenticated ? (
                !user?.role ? "/profile-completion" : getValidDashboardRoute()
              ) : "/auth"
            } replace />
          }
        />
      </Routes>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#fff',
            color: '#374151',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;