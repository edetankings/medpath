import { Select } from '../components/UI';
import React, { useState, useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { showToast, navigate } = useApp();
  const { user, logout, refreshUser } = useAuth();

  const [activeTab, setActiveTab] = useState<'personal' | 'insurance' | 'security' | 'preferences'>('personal');

  // Personal Demographics states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Insurance states
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const [isSavingInsurance, setIsSavingInsurance] = useState(false);

  // Populate form with authenticated user profile
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setDob(user.dob || '');
      setBloodGroup(user.bloodGroup || '');
      setInsuranceProvider(user.insurance?.provider || '');
      setPolicyNumber(user.insurance?.policyNumber || '');
      setGroupNumber(user.insurance?.groupNumber || '');
    }
  }, [user]);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);

    try {
      const parts = fullName.trim().split(' ');
      const firstName = parts[0] || 'Patient';
      const lastName = parts.slice(1).join(' ') || '';

      await api.updateProfile({
        firstName,
        lastName,
        phoneNumber: phone.trim(),
        dateOfBirth: dob,
        ...(bloodGroup !== (user?.bloodGroup || '') ? { bloodGroup: bloodGroup || null } : {}),
      });

      await refreshUser();
      showToast('Profile Updated', 'Your personal details have been saved to the database.', 'success');
    } catch (err: any) {
      showToast('Update Failed', err?.message || 'Could not save profile changes.', 'danger');
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSaveInsurance = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingInsurance(true);

    try {
      await api.updateProfile({
        insurance: {
          provider: insuranceProvider.trim(),
          policyNumber: policyNumber.trim(),
          groupNumber: groupNumber.trim(),
        },
      });

      await refreshUser();
      showToast('Insurance Updated', 'Your insurance coverage has been updated.', 'success');
    } catch (err: any) {
      showToast('Update Failed', err?.message || 'Could not update insurance.', 'danger');
    } finally {
      setIsSavingInsurance(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    navigate('home');
  };

  return (
    <AppShell
      title="Profile & Settings"
      subtitle="Manage your personal healthcare identity, insurance coverage, and security credentials."
    >
      {/* Navigation Tabs */}
      <div className="tab-bar" role="group" aria-label="View sections">
        <button
          type="button"
          
          aria-pressed={activeTab === 'personal'}
          className={`tab-item ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          Personal Information
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'insurance'}
          className={`tab-item ${activeTab === 'insurance' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurance')}
        >
          Insurance &amp; Coverage
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'security'}
          className={`tab-item ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Privacy &amp; Security
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'preferences'}
          className={`tab-item ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          Notifications &amp; Preferences
        </button>
      </div>

      {/* Tab 1: Personal Information */}
      {activeTab === 'personal' && (
        <div className="grid-cols-1-2">
          {/* Identity Card */}
          <div className="card" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', height: 'fit-content' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-tint)',
                color: 'var(--color-primary)',
                fontSize: '26px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '12px',
                border: '2px solid var(--color-primary-border)',
              }}
            >
              {(fullName || 'P').charAt(0).toUpperCase()}
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-navy)', margin: '0 0 2px' }}>
              {fullName || 'Authenticated Patient'}
            </h3>
            <span className="badge badge-primary" style={{ marginBottom: '12px' }}>
              Patient ID: {user?.id || '—'}
            </span>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
              Registered Email: {email}
            </div>
          </div>

          {/* Form */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Personal Demographics</h2>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>Information you provide</span>
            </div>

            <form onSubmit={handleSavePersonal}>
              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="full-name-input">Legal Full Name</label>
                  <input
                    id="full-name-input"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Jane Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="dob-input">Date of Birth</label>
                  <input
                    id="dob-input"
                    type="date"
                    className="form-control"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="email-input">Email Address</label>
                  <input
                    id="email-input"
                    type="email"
                    className="form-control"
                    value={email}
                    disabled
                    title="Email is your account identifier"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="phone-input">Phone Number</label>
                  <input
                    id="phone-input"
                    type="tel"
                    className="form-control"
                    placeholder="+1 (555) 000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="blood-group-select">Blood Group</label>
                  <Select
                    id="blood-group-select"
                    className="form-control"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                  >
                    <option value="">Not provided</option>
                    {bloodGroup && !['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].includes(bloodGroup) && (
                      <option value={bloodGroup}>{bloodGroup}</option>
                    )}
                    <option value="A+">A Positive (A+)</option>
                    <option value="A-">A Negative (A-)</option>
                    <option value="B+">B Positive (B+)</option>
                    <option value="B-">B Negative (B-)</option>
                    <option value="AB+">AB Positive (AB+)</option>
                    <option value="AB-">AB Negative (AB-)</option>
                    <option value="O+">O Positive (O+)</option>
                    <option value="O-">O Negative (O-)</option>
                  </Select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="country-input">Country of Residence</label>
                  <input
                    id="country-input"
                    type="text"
                    className="form-control"
                    value="Not provided"
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
                <button
                  type="submit"
                  className={`btn btn-primary btn-sm ${isSavingPersonal ? 'is-loading' : ''}`}
                  disabled={isSavingPersonal}
                >
                  {isSavingPersonal ? 'Saving...' : 'Save Personal Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Insurance & Coverage */}
      {activeTab === 'insurance' && (
        <div className="card" style={{ maxWidth: '640px' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Primary Health Insurance</h2>
              <div className="card-subtitle">Policy details you provide; coverage is not verified</div>
            </div>
            {user?.insurance?.provider && <span className="badge badge-neutral">Policy on file</span>}
          </div>

          <form onSubmit={handleSaveInsurance}>
            <div className="form-group">
              <label className="form-label" htmlFor="ins-provider-input">Insurance Carrier</label>
              <input
                id="ins-provider-input"
                type="text"
                className="form-control"
                placeholder="e.g. Aetna, Blue Cross Blue Shield, UnitedHealthcare"
                value={insuranceProvider}
                onChange={(e) => setInsuranceProvider(e.target.value)}
                required
              />
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="policy-num-input">Member / Policy ID</label>
                <input
                  id="policy-num-input"
                  type="text"
                  className="form-control"
                  placeholder="e.g. MEM-12345678"
                  value={policyNumber}
                  onChange={(e) => setPolicyNumber(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="group-num-input">Group Number</label>
                <input
                  id="group-num-input"
                  type="text"
                  className="form-control"
                  placeholder="e.g. GRP-98765"
                  value={groupNumber}
                  onChange={(e) => setGroupNumber(e.target.value)}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
              <button
                type="submit"
                className={`btn btn-primary btn-sm ${isSavingInsurance ? 'is-loading' : ''}`}
                disabled={isSavingInsurance}
              >
                {isSavingInsurance ? 'Updating...' : 'Update Insurance Information'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'security' && <div className="grid-cols-2-1"><div className="card"><div className="card-header"><h2 className="card-title">Privacy & access</h2></div>{['Two-factor authentication', 'Biometric unlock', 'Provider sharing and consent', 'Password management'].map(label => <div className="ui-setting-row" key={label}><div><strong>{label}</strong><p>This control is not implemented in the current deployment.</p></div><span className="badge badge-neutral">Not available</span></div>)}</div><div className="card"><h2 className="card-title">Your session</h2><p style={{margin:'20px 0'}}>Signed in as {user?.email}</p><button className="btn btn-outline" onClick={handleSignOut}><Icons.LogOut size={17}/>Sign out</button></div></div>}
      {activeTab === 'preferences' && <div className="card"><div className="card-header"><h2 className="card-title">Notifications & preferences</h2></div>{['Email appointment notifications', 'SMS reminders'].map(label => <div className="ui-setting-row" key={label}><div><strong>{label}</strong><p>Delivery and saved preferences are not configured. No preference has been changed.</p></div><span className="badge badge-neutral">In development</span></div>)}</div>}
    </AppShell>
  );
};
