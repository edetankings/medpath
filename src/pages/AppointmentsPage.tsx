import { AppointmentCalendar } from '../components/AppointmentCalendar';
import { ErrorState, Skeleton, Notice } from '../components/UI';
import React, { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { Modal } from '../components/Modal';

export const AppointmentsPage: React.FC = () => {
  const { appointmentsError, refreshAppointments } = useApp();
  const { appointments, isAppointmentsLoading, cancelAppointment, addAppointment, navigate, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'completed' | 'cancelled'>('upcoming');

  // Direct Schedule Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinic, setClinic] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00 AM');
  const [visitType, setVisitType] = useState<'in-person' | 'telehealth'>('in-person');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredAppointments = appointments.filter((a) => a.status === activeTab);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !specialty.trim()) {
      showToast('Missing Details', 'Please specify clinician name and specialty.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      await addAppointment({
        providerId: `prv-custom`,
        providerName: doctorName.trim(),
        specialty: specialty.trim(),
        clinic: clinic.trim() || '',
        address: address.trim() || '',
        date,
        time,
        type: visitType,
        status: 'upcoming',
        notes: notes.trim() || '',
      });

      setScheduleModalOpen(false);
      setActiveTab('upcoming');
      setDoctorName('');
      setSpecialty('');
      setClinic('');
      setAddress('');
      setNotes('');
    } catch (err: any) {
      showToast('Scheduling Error', err?.message || 'Failed to book appointment.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelClick = async (aptId: string, doctor: string) => {
    try {
      await cancelAppointment(aptId);
    } catch (err: any) {
      showToast('Cancellation Error', err?.message || 'Could not cancel appointment.', 'danger');
    }
  };

  if (appointmentsError) return <AppShell title="Appointments"><ErrorState message={appointmentsError} retry={refreshAppointments}/></AppShell>;
  if (isAppointmentsLoading) return <AppShell title="Appointments"><Skeleton label="Loading visit plans"/></AppShell>;
  return (
    <AppShell
      title="Appointments & Visits"
      subtitle="Keep your personal visit plans and notes in one place."
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => navigate('find-care')}
          >
            <Icons.Search size={15} />
            <span>Search Providers</span>
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setScheduleModalOpen(true)}
          >
            <Icons.Plus size={15} />
            <span>Add Visit Plan</span>
          </button>
        </div>
      }
    >
      {appointmentsError && <ErrorState message={appointmentsError} retry={refreshAppointments}/>}
<Notice title="Your personal appointment planner">Adding or cancelling a plan here does not book or cancel care with a provider. Contact your provider directly to confirm or reschedule. Video visits and reminders are not connected.</Notice>
      {!appointmentsError && !isAppointmentsLoading && <AppointmentCalendar appointments={appointments}/>}
      {/* Segmented Tab Bar */}
      <div className="tab-bar" role="group" aria-label="View sections">
        <button
          type="button"
          
          aria-pressed={activeTab === 'upcoming'}
          className={`tab-item ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Visits ({appointments.filter((a) => a.status === 'upcoming').length})
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'completed'}
          className={`tab-item ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Past Consultations ({appointments.filter((a) => a.status === 'completed').length})
        </button>
        <button
          type="button"
          
          aria-pressed={activeTab === 'cancelled'}
          className={`tab-item ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
        </button>
      </div>

      {/* Appointments List Feed */}
      <div className="appointments-feed">
        {isAppointmentsLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            Loading appointments...
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Icons.Calendar size={22} />
            </div>
            <div className="empty-state-title">
              {activeTab === 'upcoming'
                ? 'No upcoming appointments scheduled'
                : `No ${activeTab} visits in your record`}
            </div>
            <div className="empty-state-desc">
              {activeTab === 'upcoming'
                ? 'Your scheduled consultations with healthcare providers will appear here.'
                : `Past visit notes and clinical records will be archived here for reference.`}
            </div>
            {activeTab === 'upcoming' && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setScheduleModalOpen(true)}
              >
                <Icons.Plus size={15} />
                <span>Add a Visit Plan</span>
              </button>
            )}
          </div>
        ) : (
          filteredAppointments.map((apt) => {
            const dateParts = apt.date.split('-');
            const monthStr = dateParts[1]
              ? ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][parseInt(dateParts[1], 10) - 1] || 'DATE'
              : 'DATE';
            const dayStr = dateParts[2] || '01';

            return (
              <div key={apt.id} className="appointment-card-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {/* Calendar Date Block */}
                  <div className="apt-date-badge">
                    <span className="apt-month">{monthStr}</span>
                    <span className="apt-day">{dayStr}</span>
                  </div>

                  {/* Visit Details */}
                  <div className="apt-info">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span className="apt-doctor">{apt.providerName}</span>
                      <span className={`badge ${apt.type === 'telehealth' ? 'badge-primary' : 'badge-neutral'}`}>
                        {apt.type === 'telehealth' ? 'Telehealth Video' : 'In-Person Visit'}
                      </span>
                      <span className={`badge ${apt.status === 'upcoming' ? 'badge-success' : apt.status === 'completed' ? 'badge-neutral' : 'badge-danger'}`}>
                        {apt.status === 'upcoming' ? 'Upcoming' : apt.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                    </div>
                    <div className="apt-specialty">{apt.specialty}</div>
                    <div className="apt-facility">{apt.clinic} &bull; {apt.address}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                      <strong>Scheduled Time:</strong> {apt.time}
                    </div>
                    {apt.notes && (
                      <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        Note: {apt.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="apt-actions">
                  {apt.status === 'upcoming' && (
                    <>
                      {apt.type === 'telehealth' ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled title="Video visits are not connected"
                        >
                          <Icons.Video size={14} />
                          <span>Join Video</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => showToast('Clinic Address', apt.address || 'Not provided', 'info')}
                        >
                          <Icons.MapPin size={14} />
                          <span>Directions</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleCancelClick(apt.id, apt.providerName)}
                        style={{ color: 'var(--color-danger)' }}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {apt.status === 'completed' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => navigate('timeline')}
                    >
                      <span>View Visit Summary</span>
                    </button>
                  )}

                  {apt.status === 'cancelled' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setScheduleModalOpen(true)}
                    >
                      <span>Add Another Plan</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Direct Schedule Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => !isSubmitting && setScheduleModalOpen(false)}
        title="Add a personal visit plan"
        footer={
          <>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setScheduleModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn-primary btn-sm ${isSubmitting ? 'is-loading' : ''}`}
              onClick={handleScheduleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Booking...' : 'Save Visit Plan'}
            </button>
          </>
        }
      >
        <form onSubmit={handleScheduleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="doc-name-input">Doctor / Clinician Name</label>
            <input
              id="doc-name-input"
              type="text"
              className="form-control"
              placeholder="e.g. Dr. Sarah Jenkins, MD"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              required
            />
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="spec-input">Medical Specialty</label>
              <input
                id="spec-input"
                type="text"
                className="form-control"
                placeholder="e.g. Internal Medicine, Cardiology"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="visit-type-select">Visit Modality</label>
              <select
                id="visit-type-select"
                className="form-control"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as any)}
              >
                <option value="in-person">In-Person Consultation</option>
                <option value="telehealth">Telehealth Video Call</option>
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="clinic-input">Clinic / Facility Name</label>
              <input
                id="clinic-input"
                type="text"
                className="form-control"
                placeholder="e.g. University Health Center"
                value={clinic}
                onChange={(e) => setClinic(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="address-input">Clinic Address</label>
              <input
                id="address-input"
                type="text"
                className="form-control"
                placeholder="e.g. 100 Main St, Suite 400"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2" style={{ gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="apt-date-input">Appointment Date</label>
              <input
                id="apt-date-input"
                type="date"
                className="form-control"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="apt-time-input">Appointment Time</label>
              <select
                id="apt-time-input"
                className="form-control"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                <option value="09:00 AM">09:00 AM</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="01:30 PM">01:30 PM</option>
                <option value="03:00 PM">03:00 PM</option>
                <option value="04:15 PM">04:15 PM</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="apt-notes-input">Visit Notes</label>
            <textarea
              id="apt-notes-input"
              className="form-control"
              placeholder="Reason for visit or clinical concerns to discuss..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </AppShell>
  );
};
