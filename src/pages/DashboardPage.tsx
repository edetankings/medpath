import React, { useCallback, useEffect, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { Icons } from '../components/Icons';
import { ErrorState, Skeleton } from '../components/UI';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { TimelineEvent } from '../types';
import '../components/PatientDashboard.css';

const provided = (value?: string | null) => value?.trim() || 'Not provided.';
const appointmentMinutes = (value: string) => {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return 1440;
  const hour = Number(match[1]);
  const period = match[3]?.toUpperCase();
  return (period ? hour % 12 + (period === 'PM' ? 12 : 0) : hour) * 60 + Number(match[2]);
};
const dateLabel = (value: string) => {
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.getTime()) ? 'Not provided.' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const DashboardPage: React.FC = () => {
  const { navigate, appointments, passport, isAppointmentsLoading, isPassportLoading, appointmentsError, passportError, refreshAppointments, refreshPassport } = useApp();
  const { user } = useAuth();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setTimelineLoading(true); setTimelineError('');
    api.getTimeline().then(data => { if (active) setEvents(data); })
      .catch(() => { if (active) { setEvents([]); setTimelineError('Recent activity could not be loaded. Please try again.'); } })
      .finally(() => { if (active) setTimelineLoading(false); });
    return () => { active = false; };
  }, [retry]);
  const retryTimeline = useCallback(() => setRetry(value => value + 1), []);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const upcoming = appointments.filter(a => a.status === 'upcoming' && a.date >= today).sort((a, b) => a.date.localeCompare(b.date) || appointmentMinutes(a.time) - appointmentMinutes(b.time));
  const recent = [...events].sort((a, b) => b.date.localeCompare(a.date));
  // Completion measures available profile fields; missing medical entries never imply no allergies or medication.
  const fields = [user?.name, user?.email, user?.phone, user?.dob, user?.bloodGroup, user?.insurance?.provider, user?.emergencyContact?.name, user?.emergencyContact?.relationship, user?.emergencyContact?.phone];
  const completed = fields.filter(value => value?.trim()).length;
  const completion = Math.round(completed / fields.length * 100);
  const loading = isPassportLoading || isAppointmentsLoading;
  const actions = [
    { label: 'Open Healthcare Passport', detail: 'Your information, together', icon: Icons.Passport, route: 'passport' as const },
    { label: 'Find a Doctor', detail: 'Explore available providers', icon: Icons.Search, route: 'find-care' as const },
    { label: 'Book an Appointment', detail: 'Create a personal visit plan', icon: Icons.Calendar, route: 'appointments' as const },
    { label: 'Open AI Navigator', detail: 'Experimental · no clinical use', icon: Icons.Compass, route: 'ai-navigator' as const },
    { label: 'Upload Medical Document', detail: 'Keep your records in one place', icon: Icons.Upload, route: 'documents' as const },
  ];
  return <AppShell title="Patient Dashboard" subtitle="Your healthcare, thoughtfully connected.">
    <section className="pd-welcome" aria-labelledby="welcome-title">
      <div><time className="pd-welcome-date">{new Date().toLocaleDateString('en-GB', {timeZone: 'Europe/London', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}</time><span className="ui-eyebrow">YOUR PERSONAL HEALTHCARE WORKSPACE</span><h2 id="welcome-title">Welcome back, {user?.name?.split(' ')[0] || 'Patient'}<span>.</span></h2><p>A little clarity. A better path forward.<br/>Your care, records and next steps, all in one place.</p><button className="btn btn-primary" onClick={() => navigate('passport')}>Open your Passport <Icons.ArrowRight size={16}/></button></div>
      <div className="pd-welcome-mark" aria-hidden="true"><Icons.Logo size={76}/><span>One place.<br/>Your whole health journey.</span></div>
    </section>
    <div className="pd-section-heading"><h2>Healthcare overview</h2><span>From your MedPath records</span></div>
    {loading ? <Skeleton label="Loading your overview"/> : <>
      {passportError && <ErrorState message={passportError} retry={() => void refreshPassport()}/>}
      {appointmentsError && <ErrorState message={appointmentsError} retry={() => void refreshAppointments()}/>}
      <div className="pd-overview">
        <OverviewCard icon={<Icons.Passport size={21}/>} label="Passport completion" value={passportError ? 'Unavailable' : `${completion}%`} detail={`${completed} of ${fields.length} profile fields provided`}><progress max={100} value={completion} aria-label="Passport profile completion"/></OverviewCard>
        <OverviewCard icon={<Icons.Calendar size={21}/>} label="Upcoming appointments" value={appointmentsError ? 'Unavailable' : String(upcoming.length)} detail="Personal visit plans"/>
        <OverviewCard icon={<Icons.FileText size={21}/>} label="Medical documents" value={passportError ? 'Unavailable' : String(passport.documents.length)} detail="Stored in your Passport"/>
        <OverviewCard icon={<Icons.Timeline size={21}/>} label="Recent health activity" value={timelineError ? 'Unavailable' : timelineLoading ? 'Loading…' : String(events.length)} detail="Available timeline records"/>
      </div>
    </>}
    <section className="pd-actions-section" aria-labelledby="quick-title"><div className="pd-section-heading"><h2 id="quick-title">Your next step</h2><span>Quick actions</span></div><div className="pd-actions">{actions.map(action => <button key={action.route} className="pd-action" onClick={() => navigate(action.route, action.route === 'documents' ? 'upload=1' : undefined)}><span className="pd-icon"><action.icon size={22}/></span><strong>{action.label}</strong><small>{action.detail}</small><Icons.ArrowRight size={16}/></button>)}</div></section>
    <div className="pd-content-grid">
      <section className="card pd-passport"><PanelHeader title="Healthcare Passport" subtitle="The information you've chosen to share" action="View Passport" onClick={() => navigate('passport')}/>{isPassportLoading ? <Skeleton/> : passportError ? <ErrorState message={passportError} retry={() => void refreshPassport()}/> : <><div className="pd-person"><span className="pd-avatar">{user?.name?.charAt(0) || 'P'}</span><div><strong>{provided(user?.name)}</strong><span>{provided(user?.email)}</span></div><Icons.Passport size={28}/></div><dl className="pd-profile">{[
        ['Date of birth', provided(user?.dob)], ['Blood group', provided(user?.bloodGroup)], ['Phone', provided(user?.phone)], ['Insurance', provided(user?.insurance?.provider)],
        ['Allergies', passport.allergies.length ? passport.allergies.map(a => `${a.allergen} (${a.severity})`).join(', ') : 'Not provided.'],
        ['Medications', passport.medications.length ? passport.medications.map(m => `${m.name}${m.dosage ? ` · ${m.dosage}` : ''} (${m.status})`).join(', ') : 'Not provided.'],
        ['Emergency contact', provided(user?.emergencyContact?.name)], ['Relationship', provided(user?.emergencyContact?.relationship)], ['Emergency phone', provided(user?.emergencyContact?.phone)],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="pd-footnote">Patient-provided information. Missing entries do not confirm the absence of a condition.</p></>}</section>
      <section className="card"><PanelHeader title="Upcoming appointments" subtitle="Plan ahead, with a little peace of mind" action="View all" onClick={() => navigate('appointments')}/>{isAppointmentsLoading ? <Skeleton label="Loading appointments"/> : appointmentsError ? <ErrorState message={appointmentsError} retry={() => void refreshAppointments()}/> : upcoming.length ? <><p className="pd-footnote">Visit plans are not provider-confirmed bookings. Contact your provider to confirm.</p><div className="pd-appointments">{upcoming.slice(0, 3).map(a => <article key={a.id} className="pd-appointment"><div className="pd-icon"><Icons.Calendar size={23}/></div><div><strong>{provided(a.providerName)}</strong><span>{provided(a.specialty)}</span><time dateTime={a.date}>{dateLabel(a.date)} · {provided(a.time)}</time><span>{provided(a.clinic)} · {a.type === 'telehealth' ? 'Telehealth' : 'In person'}</span></div><span className="badge badge-primary">Planned</span></article>)}</div></> : <DashboardEmpty icon={<Icons.Calendar size={30}/>} title="Space for your next step" text="You have no upcoming visit plans. Explore providers and plan your next appointment." action="Find care" onClick={() => navigate('find-care')}/>}</section>
      <section className="card pd-timeline"><PanelHeader title="Your health timeline" subtitle="Recent activity from your available records" action="View timeline" onClick={() => navigate('timeline')}/>{timelineLoading ? <Skeleton label="Loading recent activity"/> : timelineError ? <ErrorState message={timelineError} retry={retryTimeline}/> : recent.length ? <ol className="pd-events">{recent.slice(0, 4).map(event => <li key={event.id}><span className="pd-event-dot"/><time dateTime={event.date}>{dateLabel(event.date)}</time><div><strong>{event.title}</strong><p>{event.summary}</p>{event.provider && <small>{event.provider}</small>}</div><span className="badge badge-neutral">{event.category}</span></li>)}</ol> : <DashboardEmpty icon={<Icons.Timeline size={30}/>} title="Your story starts here" text="No medical activity has been recorded yet. Your available record activity will appear here." action="Open Passport" onClick={() => navigate('passport')}/>}</section>
    </div>
    <div className="pd-ai-note"><Icons.Compass size={21}/><p><strong>AI Navigator is experimental.</strong> Safety evaluation is incomplete. It is unavailable for clinical use, diagnosis, treatment or emergency triage.</p></div>
  </AppShell>;
};

const OverviewCard: React.FC<{icon: React.ReactNode; label: string; value: string; detail: string; children?: React.ReactNode}> = ({icon,label,value,detail,children}) => <article className="pd-overview-card"><span className="pd-icon">{icon}</span><span>{label}</span><strong>{value}</strong><small>{value === 'Unavailable' ? 'Please retry loading your records' : detail}</small>{value !== 'Unavailable' && children}</article>;
const PanelHeader: React.FC<{title:string; subtitle:string; action:string; onClick:()=>void}> = ({title,subtitle,action,onClick}) => <div className="card-header"><div><h2 className="card-title">{title}</h2><p className="card-subtitle">{subtitle}</p></div><button className="btn btn-ghost btn-sm" onClick={onClick}>{action}<Icons.ArrowRight size={14}/></button></div>;
const DashboardEmpty: React.FC<{icon:React.ReactNode; title:string; text:string; action:string; onClick:()=>void}> = ({icon,title,text,action,onClick}) => <div className="pd-empty"><span className="pd-empty-icon">{icon}</span><h3>{title}</h3><p>{text}</p><button className="btn btn-outline" onClick={onClick}>{action}<Icons.ArrowRight size={15}/></button></div>;
