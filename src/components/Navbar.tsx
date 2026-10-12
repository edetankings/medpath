import React, { useState } from 'react';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { navigate } = useApp();
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToAnchor = (id: string) => {
    setMobileMenuOpen(false);
    navigate('home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <header className="public-header" role="banner">
      <div className="container header-inner">
        {/* Brand Logo */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            navigate('home');
          }}
          className="brand-logo"
        >
          <Icons.Logo size={30} />
          <span>MedPath</span>
        </a>

        {/* Desktop Navigation Links */}
        <nav className="nav-desktop" aria-label="Main Public Navigation">
          <button type="button" className="nav-link-btn" onClick={() => scrollToAnchor('continuum')}>
            How It Works
          </button>
          <button type="button" className="nav-link-btn" onClick={() => scrollToAnchor('features')}>
            Features
          </button>
          <button type="button" className="nav-link-btn" onClick={() => navigate('find-care')}>
            Find Care
          </button>
          <button type="button" className="nav-link-btn" onClick={() => scrollToAnchor('about')}>
            About MedPath
          </button>
        </nav>

        {/* Auth CTA Actions */}
        <div className="header-actions">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('dashboard')}
              >
                Go to Dashboard
                <Icons.ArrowRight size={15} />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate('home');
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('signin')}
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => navigate('signup')}
              >
                Get Started
              </button>
            </div>
          )}

          {/* Mobile Hamburger Menu Button */}
          <button
            type="button"
            className="mobile-menu-btn"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <Icons.Close size={20} /> : <Icons.Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="mobile-drawer animate-fade-in" role="dialog" aria-modal="true">
          <nav className="mobile-nav">
            <button type="button" className="mobile-nav-link" onClick={() => scrollToAnchor('continuum')}>
              How It Works
            </button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToAnchor('features')}>
              Features
            </button>
            <button
              type="button"
              className="mobile-nav-link"
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('find-care');
              }}
            >
              Find Care
            </button>
            <button type="button" className="mobile-nav-link" onClick={() => scrollToAnchor('about')}>
              About MedPath
            </button>

            <div style={{ height: '1px', backgroundColor: 'var(--color-border)', margin: '8px 0' }} />

            {isAuthenticated ? (
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate('dashboard');
                }}
              >
                Open Dashboard
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-outline btn-block"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('signin');
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('signup');
                  }}
                >
                  Get Started
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};
