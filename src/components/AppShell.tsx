import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import './PatientDashboard.css';

interface AppShellProps { title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; }
export const AppShell: React.FC<AppShellProps> = ({ title, subtitle, actions, children }) => {
  const { navigate, currentRoute } = useApp();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [menu, setMenu] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationButton = useRef<HTMLButtonElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { setMenu(false); setNotifications(false); requestAnimationFrame(() => document.getElementById('main-content')?.focus({preventScroll:true})); }, [currentRoute]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && menu) { setMenu(false); requestAnimationFrame(() => menuButton.current?.focus()); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);
  useEffect(() => {
    if (!menu) return;
    const sidebar = document.getElementById('app-navigation');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    mainRef.current?.setAttribute('inert', '');
    const items = () => Array.from(sidebar?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]') || []).filter(el => el.getClientRects().length);
    const focusNavigation = () => items()[0]?.focus({preventScroll:true});
    const focusFrame = requestAnimationFrame(focusNavigation);
    sidebar?.addEventListener('transitionend', focusNavigation);
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const targets = items(); const first = targets[0]; const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    const resize = () => { if (window.innerWidth > 800) setMenu(false); };
    window.addEventListener('keydown', trap); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(focusFrame); sidebar?.removeEventListener('transitionend', focusNavigation); document.body.style.overflow = previousOverflow; mainRef.current?.removeAttribute('inert'); window.removeEventListener('keydown', trap); window.removeEventListener('resize', resize); };
  }, [menu]);
  useEffect(() => {
    if (!notifications) return;
    const dismiss = (event: PointerEvent) => { if (!notificationRef.current?.contains(event.target as Node)) setNotifications(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setNotifications(false); notificationButton.current?.focus(); } };
    window.addEventListener('pointerdown', dismiss); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('pointerdown', dismiss); window.removeEventListener('keydown', escape); };
  }, [notifications]);
  return <div className={`app-layout ui2 ${collapsed ? 'is-collapsed' : ''} ${menu ? 'menu-open' : ''}`}>
    <a className="ui-skip" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <Sidebar onClose={() => { setMenu(false); requestAnimationFrame(() => menuButton.current?.focus()); }} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)}/>
    {menu && <button className="ui-menu-backdrop" onClick={() => { setMenu(false); requestAnimationFrame(() => menuButton.current?.focus()); }} aria-label="Close navigation"/>}
    <div className="app-main" ref={mainRef}>
      <header className="app-topbar">
        <div className="topbar-left"><span className="ui-eyebrow">YOUR HEALTH, CONNECTED</span><h1 className="topbar-title">{title}</h1>{subtitle && <p className="topbar-subtitle">{subtitle}</p>}</div>
        <div className="topbar-right"><time className="pd-header-date">{new Date().toLocaleDateString('en-GB', {timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'})}</time><button className="icon-button ui-mobile-menu" ref={menuButton} aria-label="Toggle navigation" aria-expanded={menu} aria-controls="app-navigation" onClick={() => setMenu(!menu)}><Icons.Menu size={20}/></button>
          <div className="pd-notification" ref={notificationRef}><button className="icon-button" ref={notificationButton} aria-label="Notifications" aria-expanded={notifications} onClick={() => setNotifications(!notifications)}><Icons.Bell size={19}/></button>{notifications && <div className="pd-notification-panel" role="status"><strong>Notifications · Coming soon</strong><p>Appointment reminders and care notifications are not connected yet.</p></div>}</div>
          <button className="user-pill" onClick={() => navigate('profile')} aria-label="Profile and settings"><span className="user-avatar-sm">{user?.avatar ? <img src={user.avatar} alt=""/> : user?.name?.charAt(0).toUpperCase() || 'P'}</span><span className="user-pill-name">{user?.name?.split(' ')[0] || 'Patient'}</span></button>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={`app-content-body page-${currentRoute}`}>
        {actions && <div className="ui-page-actions">{actions}</div>}{children}
      </main>
      <footer className="ui-app-footer">MedPath <span>Your path to better healthcare.</span></footer>
    </div>
  </div>;
};
