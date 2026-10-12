import React from 'react';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { RoutePath } from '../types';

export const Sidebar: React.FC<{ collapsed: boolean; onToggle: () => void; onClose?: () => void }> = ({ collapsed, onToggle, onClose }) => {
  const { currentRoute, navigate } = useApp();
  const { user, logout } = useAuth();

  const coreNav: { route: RoutePath; label: string; icon: React.ReactNode; badge?: string }[] = [
    { route: 'dashboard', label: 'Dashboard', icon: <Icons.Dashboard size={18} /> },
    { route: 'ai-navigator', label: 'AI Navigator', icon: <Icons.Compass size={18} />, badge: 'Experimental' },
    { route: 'find-care', label: 'Find Care', icon: <Icons.Search size={18} /> },
  ];

  const recordsNav: { route: RoutePath; label: string; icon: React.ReactNode; badge?: string }[] = [
    { route: 'passport', label: 'Healthcare Passport', icon: <Icons.Passport size={18} /> },
    { route: 'appointments', label: 'Appointments', icon: <Icons.Calendar size={18} /> },
    { route: 'documents', label: 'Medical Documents', icon: <Icons.FileText size={18} /> },
    { route: 'timeline', label: 'Health Timeline', icon: <Icons.Timeline size={18} /> },
  ];

  const connectNav: { route: RoutePath; label: string; icon: React.ReactNode; badge?: string }[] = [
    { route: 'messages', label: 'Messages', icon: <Icons.Messages size={18} />, badge: 'Coming soon' },
    { route: 'profile', label: 'Settings', icon: <Icons.User size={18} /> },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside id="app-navigation" className="app-sidebar" aria-label="Main Application Navigation">
        <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={onClose}><Icons.Close size={20}/></button>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigate('home');
            }}
            className="brand-logo"
            title="MedPath Home"
          >
            <Icons.Logo size={28} />
            <span>MedPath</span>
          </a>
        </div>

        <button className="sidebar-collapse btn btn-ghost" onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}><Icons.Menu size={18}/><span>{collapsed ? "" : "Collapse navigation"}</span></button>
        {/* Navigation Groups */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Navigation</div>
          <ul className="sidebar-menu">
            {coreNav.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <li key={item.route} className="sidebar-item">
                  <button
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.route)}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.badge && (
                      <span className={`sidebar-badge ${item.badge === 'AI' ? 'badge-ai' : 'badge-count'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="sidebar-section-title">Health Center</div>
          <ul className="sidebar-menu">
            {recordsNav.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <li key={item.route} className="sidebar-item">
                  <button
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.route)}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="sidebar-section-title">Account & Care</div>
          <ul className="sidebar-menu">
            {connectNav.map((item) => {
              const isActive = currentRoute === item.route;
              return (
                <li key={item.route} className="sidebar-item">
                  <button
                    type="button"
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.route)}
                    aria-label={item.label}
                    title={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-icon">{item.icon}</span>
                    <span className="sidebar-label">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-badge badge-count">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Card & Sign Out */}
        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            onClick={() => navigate('profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('profile');
              }
            }}
            title="View Patient Profile"
          >
            <div className="user-avatar">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="user-info">
              <div className="user-name">{user?.name || 'Patient'}</div>
              <div className="user-role">ID: {user?.id || '—'}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-logout"
            title="Sign Out"
            onClick={() => {
              void logout().finally(() => navigate('home')); 
            }}
            aria-label="Sign Out"
          >
            <Icons.LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* Dedicated Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`mobile-nav-item ${currentRoute === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigate('dashboard')}
          aria-label="Dashboard"
        >
          <Icons.Dashboard size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentRoute === 'ai-navigator' ? 'active' : ''}`}
          onClick={() => navigate('ai-navigator')}
          aria-label="AI Navigator"
        >
          <Icons.Compass size={20} />
          <span>Navigator</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentRoute === 'find-care' ? 'active' : ''}`}
          onClick={() => navigate('find-care')}
          aria-label="Find Care"
        >
          <Icons.Search size={20} />
          <span>Find Care</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentRoute === 'appointments' ? 'active' : ''}`}
          onClick={() => navigate('appointments')}
          aria-label="Appointments"
        >
          <Icons.Calendar size={20} />
          <span>Visits</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${currentRoute === 'passport' ? 'active' : ''}`}
          onClick={() => navigate('passport')}
          aria-label="Health Passport"
        >
          <Icons.Passport size={20} />
          <span>Passport</span>
        </button>
      </nav>
    </>
  );
};
