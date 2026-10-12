import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastContainer } from './components/Toast';
import { Icons } from './components/Icons';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { AiNavigatorPage } from './pages/AiNavigatorPage';
import { FindCarePage } from './pages/FindCarePage';
import { AppointmentsPage } from './pages/AppointmentsPage';
import { PassportPage } from './pages/PassportPage';
import { TimelinePage } from './pages/TimelinePage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutePath } from './types';

const PUBLIC_ROUTES: RoutePath[] = ['home', 'signin', 'signup', 'forgot'];

const AppRouter: React.FC = () => {
  const { currentRoute, navigate } = useApp();
  const { isAuthenticated, isLoading } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.includes(currentRoute);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated && !isPublicRoute) {
        // Redirect unauthenticated users immediately to sign in
        navigate('signin');
      } else if (isAuthenticated && (currentRoute === 'signin' || currentRoute === 'signup')) {
        // Authenticated users trying to access auth forms get directed to their dashboard
        navigate('dashboard');
      }
    }
  }, [isAuthenticated, isLoading, isPublicRoute, currentRoute, navigate]);

  // Handle auth checking loading state
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-bg-base)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Icons.Logo size={42} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-navy)' }}>MedPath</span>
        </div>
        <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
          Verifying secure healthcare session...
        </div>
      </div>
    );
  }

  // Route protection enforcement
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="medpath-app-root">
        <AuthPage initialMode="signin" />
        <ToastContainer />
      </div>
    );
  }

  const renderCurrentView = () => {
    switch (currentRoute) {
      case 'home':
        return <LandingPage />;
      case 'signin':
        return <AuthPage initialMode="signin" />;
      case 'signup':
        return <AuthPage initialMode="signup" />;
      case 'forgot':
        return <AuthPage initialMode="forgot" />;
      case 'dashboard':
        return <DashboardPage />;
      case 'ai-navigator':
        return <AiNavigatorPage />;
      case 'find-care':
        return <FindCarePage />;
      case 'appointments':
        return <AppointmentsPage />;
      case 'documents':
        return <PassportPage key="documents" initialTab="documents" />;
      case 'passport':
        return <PassportPage key="passport" />;
      case 'timeline':
        return <TimelinePage />;
      case 'messages':
        return <MessagesPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return <LandingPage />;
    }
  };

  return (
    <div className="medpath-app-root">
      {renderCurrentView()}
      <ToastContainer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
