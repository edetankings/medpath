import { Select, DataTable } from '../components/UI';
import { ErrorState, Skeleton } from '../components/UI';
import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { DOCUMENT_CATEGORIES, DocumentCategory } from '../types';

export const PassportPage: React.FC<{ initialTab?: 'overview' | 'documents' }> = ({ initialTab = 'overview' }) => {
  const { passportError, refreshPassport } = useApp();
  const {
    passport,
    isPassportLoading,
    addAllergy,
    deleteAllergy,
    addMedication,
    deleteMedication,
    addCondition,
    deleteCondition,
    uploadDocument,
    deleteDocument,
    showToast,
    navigate,
  } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'allergies' | 'medications' | 'conditions' | 'immunizations' | 'documents'
  >(initialTab);

  // Document Upload Modal
  const [uploadModalOpen, setUploadModalOpen] = useState(() => initialTab === 'documents' && typeof window !== 'undefined' && window.location.hash.includes('upload=1'));
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<DocumentCategory>('Lab Results');
  const [issuingDoctor, setIssuingDoctor] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Add Allergy Modal
  const [allergyModalOpen, setAllergyModalOpen] = useState(false);
  const [allergenName, setAllergenName] = useState('');
  const [allergySeverity, setAllergySeverity] = useState<'Mild' | 'Moderate' | 'Severe'>('Moderate');
  const [allergyReaction, setAllergyReaction] = useState('');
  const [allergyDate, setAllergyDate] = useState('');

  // Add Medication Modal
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDosage, setMedDosage] = useState('');
  const [medFrequency, setMedFrequency] = useState('Once daily');
  const [medDoctor, setMedDoctor] = useState('');
  const [medStartDate, setMedStartDate] = useState('');

  // Add Condition Modal
  const [condModalOpen, setCondModalOpen] = useState(false);
  const [condName, setCondName] = useState('');
  const [condDate, setCondDate] = useState('');
  const [condStatus, setCondStatus] = useState<'Active' | 'Resolved' | 'Managed'>('Active');
  const [condNotes, setCondNotes] = useState('');

  // Handlers
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isUploading) return;
    setUploadError('');
    if (!selectedFile) {
      setUploadError('Choose a PDF, PNG or JPEG document.');
      return;
    }
    if (!docTitle.trim()) {
      setUploadError('Enter a title for this document.');
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024 || !/\.(pdf|png|jpe?g)$/i.test(selectedFile.name)) { setUploadError('Choose a PDF, PNG or JPEG file no larger than 15 MB.'); return; }
    if (!DOCUMENT_CATEGORIES.includes(docCategory)) { setUploadError('Choose a valid document category.'); return; }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', docTitle.trim());
      formData.append('category', docCategory);
      formData.append('issuing_doctor', issuingDoctor.trim());

      await uploadDocument(formData);
      setDocTitle('');
      setSelectedFile(null);
      setIssuingDoctor('');
      setUploadModalOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || 'Could not upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAllergySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergenName.trim() || !allergyReaction.trim()) return;

    try {
      await addAllergy({
        allergen: allergenName.trim(),
        severity: allergySeverity,
        reaction: allergyReaction.trim(),
        diagnosedDate: allergyDate,
      });
      setAllergenName('');
      setAllergyReaction('');
      setAllergyDate('');
      setAllergyModalOpen(false);
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not add allergy.', 'danger');
    }
  };

  const handleMedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName.trim() || !medDosage.trim() || !medDoctor.trim()) { showToast('Required information', 'Enter the medication, dosage and prescribing clinician. The current API requires a clinician name.', 'warning'); return; }

    try {
      await addMedication({
        name: medName.trim(),
        dosage: medDosage.trim(),
        frequency: medFrequency.trim(),
        prescribingDoctor: medDoctor.trim(),
        startDate: medStartDate,
        status: 'Active',
      });
      setMedName('');
      setMedDosage('');
      setMedFrequency('Once daily');
      setMedDoctor('');
      setMedStartDate('');
      setMedModalOpen(false);
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not add medication.', 'danger');
    }
  };

  const handleCondSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condName.trim()) return;

    try {
      await addCondition({
        condition: condName.trim(),
        diagnosedDate: condDate,
        status: condStatus,
        notes: condNotes.trim(),
      });
      setCondName('');
      setCondDate('');
      setCondNotes('');
      setCondModalOpen(false);
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not add condition.', 'danger');
    }
  };

  const handleDownload = async (docId: string, title: string, fileName?: string) => {
    try {
      showToast('Downloading', `Retrieving ${title}...`, 'info');
      await api.downloadDocument(docId, fileName || title);
    } catch (err: any) {
      showToast('Download Error', err?.message || 'Unable to download document.', 'danger');
    }
  };

  if (passportError) return <AppShell title={initialTab === 'documents' ? 'Medical Documents' : 'Healthcare Passport'}><ErrorState message={passportError} retry={refreshPassport}/></AppShell>;
  if (isPassportLoading) return <AppShell title={initialTab === 'documents' ? 'Medical Documents' : 'Healthcare Passport'}><Skeleton label="Loading passport records"/></AppShell>;
  return (
    <AppShell
      title={initialTab === 'documents' ? 'Medical Documents' : 'Healthcare Passport'}
      subtitle="Your information, together. Organize the records and documents you choose to add."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('profile')}
          >
            <Icons.User size={15} />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setUploadModalOpen(true)}
          >
            <Icons.Upload size={15} />
            <span>Upload Document</span>
          </button>
        </div>
      }
    >
      {passportError && <ErrorState message={passportError} retry={refreshPassport}/>}
      {/* Passport Identity Banner */}
      <div className="passport-banner">
        <div className="passport-banner-left">
          <h2>{user?.name || 'Patient Record'}</h2>
          <p>
            Patient ID: <strong>{user?.id || '—'}</strong> &bull; DOB: {user?.dob || 'Not provided'} &bull; Blood Type: <strong>{user?.bloodGroup || 'Not provided'}</strong>
          </p>
        </div>
        <div>
          <span className="badge badge-success">
            <Icons.ShieldCheck size={14} />
            <span>Authenticated Patient Record</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar" role="group" aria-label="View sections">
        <button
          type="button"
          
          aria-pressed={activeTab === 'overview'}
          className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Personal &amp; Emergency
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'allergies'}
          className={`tab-item ${activeTab === 'allergies' ? 'active' : ''}`}
          onClick={() => setActiveTab('allergies')}
        >
          Allergies ({passport.allergies.length})
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'medications'}
          className={`tab-item ${activeTab === 'medications' ? 'active' : ''}`}
          onClick={() => setActiveTab('medications')}
        >
          Medications ({passport.medications.length})
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'conditions'}
          className={`tab-item ${activeTab === 'conditions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conditions')}
        >
          Medical History ({passport.conditions.length})
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'immunizations'}
          className={`tab-item ${activeTab === 'immunizations' ? 'active' : ''}`}
          onClick={() => setActiveTab('immunizations')}
        >
          Immunizations
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'documents'}
          className={`tab-item ${activeTab === 'documents' ? 'active' : ''}`}
          onClick={() => setActiveTab('documents')}
        >
          Documents ({passport.documents.length})
        </button>
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          {/* Identity & Demographics */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Personal Demographics</h2>
              <span className="badge badge-neutral">Confidential</span>
            </div>
            <div className="info-grid-2">
              <div className="info-field-group">
                <span className="info-field-label">Legal Name</span>
                <span className="info-field-val">{user?.name || '—'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Date of Birth</span>
                <span className="info-field-val">{user?.dob || 'Not provided'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Phone</span>
                <span className="info-field-val">{user?.phone || 'Not provided'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Email</span>
                <span className="info-field-val">{user?.email || '—'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Blood Group</span>
                <span className="info-field-val">{user?.bloodGroup || 'Not provided'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Country</span>
                <span className="info-field-val">Not provided</span>
              </div>
            </div>
          </div>

          {/* Emergency Contact & Insurance */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Emergency Contact &amp; Insurance</h2>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('profile')}
              >
                Update
              </button>
            </div>
            <div className="info-grid-2">
              <div className="info-field-group">
                <span className="info-field-label">Emergency Contact</span>
                <span className="info-field-val">{user?.emergencyContact?.name || 'Not provided'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Relationship</span>
                <span className="info-field-val">{user?.emergencyContact?.relationship || '—'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Contact Phone</span>
                <span className="info-field-val">{user?.emergencyContact?.phone || '—'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Insurance Carrier</span>
                <span className="info-field-val">{user?.insurance?.provider || 'Not provided'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Policy Number</span>
                <span className="info-field-val">{user?.insurance?.policyNumber || '—'}</span>
              </div>
              <div className="info-field-group">
                <span className="info-field-label">Group Number</span>
                <span className="info-field-val">{user?.insurance?.groupNumber || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Allergies */}
      {activeTab === 'allergies' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Documented Allergies &amp; Adverse Reactions</h2>
              <div className="card-subtitle">Verified clinical allergy records</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setAllergyModalOpen(true)}
            >
              <Icons.Plus size={14} />
              <span>Add Allergy</span>
            </button>
          </div>

          {isPassportLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading allergies...
            </div>
          ) : passport.allergies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.ShieldCheck size={20} /></div>
              <div className="empty-state-title">No documented allergies</div>
              <div className="empty-state-desc">No drug, food, or environmental allergies have been reported for your profile.</div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setAllergyModalOpen(true)}
              >
                Document an Allergy
              </button>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <DataTable label="Healthcare Passport records">
                <thead>
                  <tr>
                    <th>Allergen</th>
                    <th>Severity</th>
                    <th>Clinical Reaction</th>
                    <th>Diagnosed Date</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passport.allergies.map((allergy) => (
                    <tr key={allergy.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{allergy.allergen}</td>
                      <td>
                        <span className={`badge ${allergy.severity === 'Severe' ? 'badge-danger' : allergy.severity === 'Moderate' ? 'badge-warning' : 'badge-neutral'}`}>
                          {allergy.severity}
                        </span>
                      </td>
                      <td>{allergy.reaction}</td>
                      <td className="text-supporting">{allergy.diagnosedDate || 'Not provided'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={async () => { try { await deleteAllergy(allergy.id); } catch { showToast('Could not remove record', 'Please try again.', 'danger'); } } }
                          title="Remove allergy"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}

      {/* Tab: Medications */}
      {activeTab === 'medications' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Prescriptions &amp; Ongoing Medications</h2>
              <div className="card-subtitle">Active medication schedule and dosages</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setMedModalOpen(true)}
            >
              <Icons.Plus size={14} />
              <span>Add Medication</span>
            </button>
          </div>

          {isPassportLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading prescriptions...
            </div>
          ) : passport.medications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.Pill size={20} /></div>
              <div className="empty-state-title">No active medications</div>
              <div className="empty-state-desc">You have no active prescriptions currently logged in your Healthcare Passport.</div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setMedModalOpen(true)}
              >
                Add Prescription
              </button>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <DataTable label="Healthcare Passport records">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Dosage &amp; Frequency</th>
                    <th>Prescribing Doctor</th>
                    <th>Start Date</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passport.medications.map((med) => (
                    <tr key={med.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{med.name}</td>
                      <td>{med.dosage} &bull; {med.frequency}</td>
                      <td>{med.prescribingDoctor || 'Not provided'}</td>
                      <td className="text-supporting">{med.startDate || 'Not provided'}</td>
                      <td>
                        <span className={`badge ${med.status === 'Active' ? 'badge-success' : 'badge-neutral'}`}>
                          {med.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={async () => { try { await deleteMedication(med.id); } catch { showToast('Could not remove record', 'Please try again.', 'danger'); } } }
                          title="Remove medication"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}

      {/* Tab: Health Conditions */}
      {activeTab === 'conditions' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Diagnosed Health History &amp; Conditions</h2>
              <div className="card-subtitle">Chronic and managed clinical history</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setCondModalOpen(true)}
            >
              <Icons.Plus size={14} />
              <span>Add Condition</span>
            </button>
          </div>

          {isPassportLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading health history...
            </div>
          ) : passport.conditions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.Activity size={20} /></div>
              <div className="empty-state-title">No conditions recorded</div>
              <div className="empty-state-desc">No chronic or acute health conditions have been entered into your record.</div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setCondModalOpen(true)}
              >
                Record Health Condition
              </button>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <DataTable label="Healthcare Passport records">
                <thead>
                  <tr>
                    <th>Condition</th>
                    <th>Status</th>
                    <th>Diagnosed Date</th>
                    <th>Clinical Notes</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {passport.conditions.map((cond) => (
                    <tr key={cond.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{cond.condition}</td>
                      <td>
                        <span className="badge badge-primary">{cond.status}</span>
                      </td>
                      <td className="text-supporting">{cond.diagnosedDate || 'Not provided'}</td>
                      <td style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{cond.notes || 'Not provided'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={async () => { try { await deleteCondition(cond.id); } catch { showToast('Could not remove record', 'Please try again.', 'danger'); } } }
                          title="Remove condition"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}

      {/* Tab: Immunizations */}
      {activeTab === 'immunizations' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Vaccinations &amp; Immunization Records</h2>
              <div className="card-subtitle">Verified immunization documentation</div>
            </div>
          </div>

          <div className="empty-state">
            <div className="empty-state-icon"><Icons.ShieldCheck size={20} /></div>
            <div className="empty-state-title">No immunization records provided</div>
            <div className="empty-state-desc">
              Upload your vaccine administration cards or official immunization records under the Documents tab to keep your vaccination history together.
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setActiveTab('documents');
                setUploadModalOpen(true);
              }}
            >
              Upload Vaccine Card
            </button>
          </div>
        </div>
      )}

      {/* Tab: Documents */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Medical Documents &amp; Lab Reports</h2>
              <div className="card-subtitle">Diagnostic blood work, radiology scans, and clinician notes</div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setUploadModalOpen(true)}
            >
              <Icons.Upload size={15} />
              <span>Upload Document</span>
            </button>
          </div>

          {isPassportLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              Loading documents...
            </div>
          ) : passport.documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Icons.FileText size={20} /></div>
              <div className="empty-state-title">Your healthcare passport is ready</div>
              <div className="empty-state-desc">
                Upload your medical records, lab reports, and radiology scans to organize them in your Healthcare Passport.
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setUploadModalOpen(true)}
              >
                Upload Record
              </button>
            </div>
          ) : (
            <div className="data-table-wrapper">
              <DataTable label="Healthcare Passport records">
                <thead>
                  <tr>
                    <th>Document Title</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>File Size</th>
                    <th>Issuing Clinician</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {passport.documents.map((doc) => (
                    <tr key={doc.id}>
                      <td style={{ fontWeight: 600, color: 'var(--color-navy)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icons.FileText size={16} style={{ color: 'var(--color-primary)' }} />
                          <span>{doc.title}</span>
                        </div>
                      </td>
                      <td><span className="badge badge-neutral">{doc.category}</span></td>
                      <td className="text-supporting">{doc.date || 'Not provided'}</td>
                      <td className="text-supporting">{doc.fileSize}</td>
                      <td style={{ fontSize: '13px' }}>{doc.doctor || 'Not provided'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn btn-outline btn-sm"
                            style={{ padding: '3px 8px', fontSize: '12px' }}
                            onClick={() => handleDownload(doc.id, doc.title, doc.fileName)}
                          >
                            <Icons.Download size={13} />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '3px 8px', fontSize: '12px', color: 'var(--color-danger)' }}
                            onClick={async () => {
                              try { await deleteDocument(doc.id); }
                              catch (err: any) { showToast('Delete Error', err?.message || 'Unable to delete document.', 'danger'); }
                            }}
                            title="Delete document"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => !isUploading && setUploadModalOpen(false)}
        title="Upload Medical Record"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-primary btn-sm ${isUploading ? 'is-loading' : ''}`}
              onClick={handleUploadSubmit}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Upload & Save'}
            </button>
          </>
        }
      >
        <form onSubmit={handleUploadSubmit} aria-busy={isUploading}>
          {uploadError && <ErrorState message={uploadError}/>}
          {isUploading && <div role="status" className="ui-upload-progress"><progress aria-label="Uploading document"/><p>Uploading and saving your document. Please wait.</p></div>}
          <div className="form-group">
            <label className="form-label" htmlFor="doc-title-input">
              Document Title
            </label>
            <input
              id="doc-title-input"
              type="text"
              className="form-control"
              placeholder="e.g. Comprehensive Metabolic Panel, MRI Brain, Cardiology Consult"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-category-select">
              Category
            </label>
            <Select
              id="doc-category-select"
              className="form-control"
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value as DocumentCategory)}
            >
              {DOCUMENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-doctor-input">
              Issuing Clinician / Facility
            </label>
            <input
              id="doc-doctor-input"
              type="text"
              className="form-control"
              placeholder="e.g. Dr. Jane Smith / Quest Diagnostics"
              value={issuingDoctor}
              onChange={(e) => setIssuingDoctor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="doc-file-input">Select Medical File (PDF, PNG, JPEG &bull; max 15MB)</label>
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="form-control ui-file-picker" disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setSelectedFile(file);
                  if (!docTitle) {
                    setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                  }
                }
              }}
              required
            />
            {selectedFile && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--color-primary)', fontWeight: 500 }}>
                Selected: {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
            )}
          </div>
        </form>
      </Modal>

      {/* Add Allergy Modal */}
      <Modal
        isOpen={allergyModalOpen}
        onClose={() => setAllergyModalOpen(false)}
        title="Document New Allergy"
        footer={
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAllergyModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleAllergySubmit}>
              Save Allergy
            </button>
          </>
        }
      >
        <form onSubmit={handleAllergySubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="allergen-input">Allergen Name</label>
            <input
              id="allergen-input"
              type="text"
              className="form-control"
              placeholder="e.g. Penicillin, Peanuts, Latex"
              value={allergenName}
              onChange={(e) => setAllergenName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="allergy-severity-select">Severity Level</label>
            <Select
              id="allergy-severity-select"
              className="form-control"
              value={allergySeverity}
              onChange={(e) => setAllergySeverity(e.target.value as any)}
            >
              <option value="Mild">Mild (Localized rash, itching)</option>
              <option value="Moderate">Moderate (Hives, gastrointestinal distress)</option>
              <option value="Severe">Severe (Anaphylaxis, respiratory distress)</option>
            </Select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="allergy-reaction-input">Clinical Reaction</label>
            <input
              id="allergy-reaction-input"
              type="text"
              className="form-control"
              placeholder="e.g. Facial swelling, shortness of breath, urticaria"
              value={allergyReaction}
              onChange={(e) => setAllergyReaction(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="allergy-date-input">Diagnosed Date</label>
            <input
              id="allergy-date-input"
              type="date"
              className="form-control"
              value={allergyDate}
              onChange={(e) => setAllergyDate(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Add Medication Modal */}
      <Modal
        isOpen={medModalOpen}
        onClose={() => setMedModalOpen(false)}
        title="Add Prescription Medication"
        footer={
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setMedModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleMedSubmit}>
              Save Prescription
            </button>
          </>
        }
      >
        <form onSubmit={handleMedSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="med-name-input">Medication Name</label>
            <input
              id="med-name-input"
              type="text"
              className="form-control"
              placeholder="e.g. Lisinopril, Metformin, Atorvastatin"
              value={medName}
              onChange={(e) => setMedName(e.target.value)}
              required
            />
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="med-dosage-input">Dosage</label>
              <input
                id="med-dosage-input"
                type="text"
                className="form-control"
                placeholder="e.g. 10mg, 500mg"
                value={medDosage}
                onChange={(e) => setMedDosage(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="med-freq-input">Frequency</label>
              <input
                id="med-freq-input"
                type="text"
                className="form-control"
                placeholder="e.g. Once daily, Twice daily with meals"
                value={medFrequency}
                onChange={(e) => setMedFrequency(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="med-doctor-input">Prescribing Physician</label>
              <input
                id="med-doctor-input"
                type="text"
                className="form-control"
                placeholder="e.g. Dr. Robert Chen"
                value={medDoctor}
                onChange={(e) => setMedDoctor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="med-start-input">Start Date</label>
              <input
                id="med-start-input"
                type="date"
                className="form-control"
                value={medStartDate}
                onChange={(e) => setMedStartDate(e.target.value)}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Condition Modal */}
      <Modal
        isOpen={condModalOpen}
        onClose={() => setCondModalOpen(false)}
        title="Record Medical Condition"
        footer={
          <>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setCondModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCondSubmit}>
              Save Condition
            </button>
          </>
        }
      >
        <form onSubmit={handleCondSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="cond-name-input">Condition / Diagnosis</label>
            <input
              id="cond-name-input"
              type="text"
              className="form-control"
              placeholder="e.g. Essential Hypertension, Type 2 Diabetes, Asthma"
              value={condName}
              onChange={(e) => setCondName(e.target.value)}
              required
            />
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cond-status-select">Status</label>
              <Select
                id="cond-status-select"
                className="form-control"
                value={condStatus}
                onChange={(e) => setCondStatus(e.target.value as any)}
              >
                <option value="Active">Active</option>
                <option value="Managed">Managed</option>
                <option value="Resolved">Resolved</option>
              </Select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cond-date-input">Diagnosed Date</label>
              <input
                id="cond-date-input"
                type="date"
                className="form-control"
                value={condDate}
                onChange={(e) => setCondDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cond-notes-input">Clinical Notes</label>
            <textarea
              id="cond-notes-input"
              className="form-control"
              placeholder="Management plan, monitoring notes..."
              value={condNotes}
              onChange={(e) => setCondNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
