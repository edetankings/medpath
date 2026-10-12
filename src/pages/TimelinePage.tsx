import { ErrorState, Skeleton } from '../components/UI';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { TimelineEvent, TimelineCategory } from '../types';

export const TimelinePage: React.FC = () => {
  const [loadError, setLoadError] = useState('');
  const { navigate, showToast } = useApp();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = [
    { key: 'all', label: 'All Events' },
    { key: 'consultation', label: 'Doctor Visits' },
    { key: 'lab', label: 'Laboratory Panels' },
    { key: 'imaging', label: 'Imaging & Scans' },
    { key: 'immunization', label: 'Immunizations' },
    { key: 'prescription', label: 'Prescriptions' },
  ];

  useEffect(() => {
    const fetchTimeline = async () => {
      setIsLoading(true); setLoadError('');
      try {
        const data = await api.getTimeline();
        setEvents(data);
      } catch (err: any) {
        setLoadError('Your timeline could not be loaded. Please return to this page to try again.');
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeline();
  }, []);

  const filteredEvents = events.filter((event) => {
    if (fromDate && event.date.slice(0,10) < fromDate) return false;
    if (toDate && event.date.slice(0,10) > toDate) return false;
    if (activeCategory === 'all') return true;
    return event.category === activeCategory;
  });

  const getCategoryBadge = (category: TimelineCategory) => {
    switch (category) {
      case 'consultation':
        return <span className="badge badge-primary">Doctor Visit</span>;
      case 'lab':
        return <span className="badge badge-info">Laboratory</span>;
      case 'imaging':
        return <span className="badge badge-warning">Radiology &amp; Scan</span>;
      case 'immunization':
        return <span className="badge badge-success">Immunization</span>;
      case 'prescription':
        return <span className="badge badge-neutral">Prescription</span>;
      default:
        return <span className="badge badge-neutral">Milestone</span>;
    }
  };

  const handleExportTimeline = () => {
    showToast('Export unavailable', 'Timeline file export is not implemented yet.', 'info');
  };

  return (
    <AppShell
      title="Health Timeline"
      subtitle="Your record activity, in perspective. Based on information in your account."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled title="Export is in development" onClick={handleExportTimeline}
          >
            <Icons.Download size={15} />
            <span>Export Timeline</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('appointments')}
          >
            <Icons.Plus size={15} />
            <span>Add Visit Plan</span>
          </button>
        </div>
      }
    >
<div className="ui-date-filter"><label>From date<input type="date" className="form-control" value={fromDate} onChange={e=>setFromDate(e.target.value)}/></label><label>To date<input type="date" className="form-control" value={toDate} min={fromDate} onChange={e=>setToDate(e.target.value)}/></label><button className="btn btn-ghost" onClick={()=>{setFromDate('');setToDate('');}}>Clear dates</button></div>
      {/* Category Tabs */}
      <div className="tab-bar" role="group" aria-label="View sections">
        {categories.map((cat) => (
          <button
            key={cat.key}
            type="button"
            
            aria-pressed={activeCategory === cat.key}
            className={`tab-item ${activeCategory === cat.key ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loadError ? <ErrorState message={loadError}/> : isLoading ? (
        <Skeleton/>
      ) : filteredEvents.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icons.Timeline size={22} />
          </div>
          <div className="empty-state-title">Your healthcare journey starts here</div>
          <div className="empty-state-desc">
            Your clinical consultations, health conditions, prescriptions, and medical milestones will appear here chronologically as you manage your care.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('appointments')}
          >
            <Icons.Plus size={15} />
            <span>Add Your First Plan</span>
          </button>
        </div>
      ) : (
        <div className="timeline-tree">
          {filteredEvents.map((event) => (
            <div key={event.id} className="timeline-node">
              <div className="timeline-node-pin" />

              <div className="timeline-node-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="timeline-node-title">{event.title}</span>
                  {getCategoryBadge(event.category)}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{event.date}</span>
              </div>

              {event.provider && (
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-primary)', marginBottom: '4px' }}>
                  {event.provider}
                </div>
              )}

              <div className="timeline-node-body">{event.summary}</div>

              {event.details && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '8px', padding: '8px 12px', backgroundColor: 'var(--color-bg-subtle)', borderRadius: 'var(--radius-sm)' }}>
                  <details><summary>View event notes</summary>{event.details}</details>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};
