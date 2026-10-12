import { ErrorState, Skeleton, Notice } from '../components/UI';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import { HealthcareProvider, CareType } from '../types';

export const FindCarePage: React.FC = () => {
  const [loadError, setLoadError] = useState('');
  const { navigate } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<CareType>('All');
  const [onlyTelehealth, setOnlyTelehealth] = useState(false);
  const [onlyInNetwork, setOnlyInNetwork] = useState(false);
  const [location, setLocation] = useState('');
  const [providers, setProviders] = useState<HealthcareProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const specialties: CareType[] = [
    'All',
    'Primary Care',
    'Specialist',
    'Urgent Care',
    'Telehealth',
    'Mental Health',
  ];

  useEffect(() => {
    const fetchProviders = async () => {
      setIsLoading(true); setLoadError('');
      try {
        const list = await api.getProviders({
          search: searchQuery,
          careType: selectedSpecialty !== 'All' ? selectedSpecialty : undefined,
          telehealthOnly: onlyTelehealth,
        });
        setProviders(list);
      } catch {
        setLoadError('This information could not be loaded. Please return to this page to try again.');
        setProviders([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProviders();
  }, [searchQuery, selectedSpecialty, onlyTelehealth, onlyInNetwork]);

  return (
    <AppShell
      title="Find Healthcare Services"
      subtitle="Explore care options. Live provider discovery is in development."
      actions={
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => navigate('appointments')}
        >
          <Icons.Calendar size={15} />
          <span>My Appointments</span>
        </button>
      }
    >
      <Notice title="Provider discovery is in development">No live availability or verified provider network is connected. Contact your chosen provider directly for care.</Notice>
      {/* 1. Prominent Discovery Search Area */}
      <div className="search-filter-box">
        <div style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-navy)', marginBottom: '4px' }}>
            Healthcare Provider Directory
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
            Search the connected directory when provider data becomes available.
          </p>
        </div>

        {/* Search Bar */}
        <div className="search-input-wrap">
          <Icons.Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search doctors, hospitals, clinics, laboratories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search healthcare providers"
          />
          {searchQuery && (
            <button
              type="button"
              className="icon-button"
              style={{ position: 'absolute', right: '12px' }}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search query"
            >
              <Icons.Close size={16} />
            </button>
          )}
        </div>

<label className="form-label" htmlFor="care-location">Location</label><input id="care-location" className="form-control" placeholder="Filter returned providers by city or address" value={location} onChange={e=>setLocation(e.target.value)}/>
        {/* Filter Controls Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div className="filter-pills-row" role="group" aria-label="Specialty Filter">
            {specialties.map((spec) => (
              <button
                key={spec}
                type="button"
                className={`filter-pill ${selectedSpecialty === spec ? 'active' : ''}`}
                aria-pressed={selectedSpecialty === spec} onClick={() => setSelectedSpecialty(spec)}
              >
                {spec}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyInNetwork}
                onChange={(e) => setOnlyInNetwork(e.target.checked)}
              />
              <span>In-Network Only</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={onlyTelehealth}
                onChange={(e) => setOnlyTelehealth(e.target.checked)}
              />
              <span>Telehealth Available</span>
            </label>
          </div>
        </div>
      </div>

      {/* Honest Network Status Banner & Empty State */}
      {loadError ? <ErrorState message={loadError}/> : isLoading ? (
        <Skeleton/>
      ) : providers.filter(p => (!onlyInNetwork || p.acceptsInsurance) && p.address.toLowerCase().includes(location.toLowerCase())).length === 0 ? (
        <div className="empty-state" style={{ maxWidth: '680px', margin: '40px auto', padding: '40px 24px' }}>
          <div className="empty-state-icon" style={{ width: '48px', height: '48px', marginBottom: '16px' }}>
            <Icons.Search size={24} />
          </div>
          <div className="empty-state-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
            Healthcare Provider Search
          </div>
          <div className="empty-state-desc" style={{ fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            Provider discovery will become available when MedPath's healthcare network is connected.
            Contact providers directly to arrange care. Appointments stores personal plans only.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => navigate('appointments')}
          >
            <Icons.Plus size={15} />
            <span>Organize a Visit Plan</span>
          </button>
        </div>
      ) : (
        <div className="providers-grid">
          {providers.filter(p => (!onlyInNetwork || p.acceptsInsurance) && p.address.toLowerCase().includes(location.toLowerCase())).map((provider) => (
            <div key={provider.id} className="provider-card-modern">
              <div className="provider-card-header">
                <div className="provider-avatar-box">
                  {provider.name.charAt(0)}
                </div>
                <div className="provider-meta-info" style={{ flex: 1 }}>
                  <h3>{provider.name}</h3>
                  <div className="provider-spec">{provider.specialty}</div>
                  <div className="provider-facility-name">{provider.clinic} &bull; {provider.address}</div>
                </div>
              </div>
              <details><summary>Provider details</summary><p className="provider-bio-snippet">{provider.bio || "No additional information provided."}</p>{provider.nextAvailable && <p>Reported availability: {provider.nextAvailable}</p>}</details>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
};
