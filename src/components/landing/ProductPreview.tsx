import React, { useId, useState } from 'react';
import { Icons } from '../Icons';

export type PreviewKind = 'navigator' | 'passport' | 'care' | 'appointments' | 'timeline';

export const PreviewContent: React.FC<{ kind: PreviewKind }> = ({ kind }) => {
  if (kind === 'navigator') return <div className="mp-chat-preview">
    <div className="mp-preview-icon"><Icons.Compass size={24} /></div>
    <h3>A little clarity.<br />A good place to begin.</h3>
    <div className="mp-chat-question">How can I prepare for a first appointment?</div>
    <div className="mp-chat-answer"><span className="mp-mini-label">NAVIGATION EXAMPLE</span><p>Start with the questions you want to ask. Bring your medication list and any records you would like to discuss.</p><div className="mp-preview-chip"><Icons.FileText size={13} /> Make a visit checklist</div></div>
    <span className="mp-scene-note">Illustrative guidance - not a diagnosis</span>
  </div>;
  if (kind === 'passport') return <div className="mp-passport-preview">
    <div className="mp-passport-cover"><Icons.Passport size={26} /><span>Healthcare<br /><strong>Passport</strong></span><span className="mp-cover-mark">M / P</span></div>
    <div className="mp-record-row"><span className="mp-record-icon"><Icons.User size={17} /></span><span>Personal details<small>Information you choose to add</small></span><Icons.ArrowRight size={15} /></div>
    <div className="mp-record-row"><span className="mp-record-icon"><Icons.FileText size={17} /></span><span>Medical documents<small>Keep important records together</small></span><Icons.ArrowRight size={15} /></div>
    <div className="mp-record-row"><span className="mp-record-icon"><Icons.Pill size={17} /></span><span>Medications & allergies<small>A reference for your next conversation</small></span><Icons.ArrowRight size={15} /></div>
  </div>;
  if (kind === 'care') return <div className="mp-care-preview">
    <div className="mp-map" aria-hidden="true"><div className="mp-map-road mp-road-one"/><div className="mp-map-road mp-road-two"/><div className="mp-map-road mp-road-three"/><span className="mp-map-pin"><Icons.MapPin size={24} /></span><span className="mp-map-pin mp-pin-small"><Icons.Plus size={16}/></span><span className="mp-map-zone"/></div>
    <div className="mp-care-overlay"><span className="mp-mini-label">THE NEXT CONNECTION</span><h3>Care that fits your needs.</h3><div className="mp-filter-pills"><span>Specialty</span><span>Location</span><span>Preferences</span></div><p>Live provider discovery is in development.</p></div>
  </div>;
  if (kind === 'appointments') return <div className="mp-appointment-preview">
    <div className="mp-calendar-title"><h3>A little more prepared.</h3><Icons.Calendar size={21}/></div>
    <div className="mp-week" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <div className={i === 2 ? 'is-selected' : ''} key={i}><span>{day}</span><strong>{12+i}</strong><i/></div>)}</div>
    <div className="mp-visit-note"><span className="mp-mini-label">SAMPLE VISIT PLAN</span><h4>Your next conversation</h4><p>Questions to ask. Records to bring. Notes to remember.</p><div className="mp-check-row"><Icons.CheckCircle size={17}/> Prepare a medication list</div><div className="mp-check-row"><Icons.CheckCircle size={17}/> Write down your questions</div></div>
    <span className="mp-scene-note">Illustrative plan - no appointment booked</span>
  </div>;
  return <div className="mp-timeline-preview"><span className="mp-mini-label">ONE CONNECTED STORY</span><h3>See how your journey<br />comes together.</h3><div className="mp-timeline-line">{[
    ['A record added', 'A document, ready for your next visit.', Icons.FileText],
    ['A plan made', 'An appointment noted in your planner.', Icons.Calendar],
    ['A next step', 'Your health activity, in one place.', Icons.Activity],
  ].map(([title, desc, Icon], i) => { const Mark = Icon as typeof Icons.FileText; return <div className="mp-timeline-item" key={i}><span><Mark size={17}/></span><div><strong>{title as string}</strong><p>{desc as string}</p></div></div>; })}</div></div>;
};

export const DashboardPreview: React.FC = () => {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const tabs = ['Overview', 'Passport', 'Timeline'];
  return <div className="mp-dashboard">
    <div className="mp-dashboard-bar"><span className="mp-window-dots" aria-hidden="true"><i/><i/><i/></span><span>YOUR MEDPATH</span><span className="mp-demo-badge">Illustrative preview</span></div>
    <div className="mp-dashboard-body">
      <aside className="mp-preview-rail" aria-hidden="true"><Icons.Logo size={25}/><span className="is-selected"><Icons.Dashboard size={18}/></span><span><Icons.Compass size={18}/></span><span><Icons.Passport size={18}/></span><span><Icons.Calendar size={18}/></span><span className="mp-rail-bottom"><Icons.User size={18}/></span></aside>
      <div className="mp-dashboard-main"><div className="mp-dashboard-greeting"><span className="mp-mini-label">A CLEARER VIEW OF YOUR HEALTH</span><h2>Your next step starts here.</h2></div>
        <div className="mp-preview-tabs" role="tablist" aria-label="Explore the illustrative dashboard">{tabs.map((tab, i) => <button key={tab} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={selected === i} aria-controls={`${id}-panel`} tabIndex={selected === i ? 0 : -1} onClick={() => setSelected(i)} onKeyDown={e => {
          const next = e.key === 'ArrowRight' ? (i+1)%3 : e.key === 'ArrowLeft' ? (i+2)%3 : e.key === 'Home' ? 0 : e.key === 'End' ? 2 : null;
          if (next !== null) { e.preventDefault(); setSelected(next); document.getElementById(`${id}-tab-${next}`)?.focus(); }
        }}>{tab}</button>)}</div>
        <div className="mp-dashboard-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${selected}`} tabIndex={0}>
          {selected === 0 ? <><div className="mp-next-step"><span className="mp-mini-label">YOUR HEALTHCARE NAVIGATOR</span><Icons.Compass size={34}/><h3>One question.<br />A place to start.</h3><p>Make sense of your next healthcare step.</p><button type="button" onClick={() => setSelected(1)}>Explore your passport <Icons.ArrowRight size={16}/></button></div><div className="mp-dashboard-bottom"><div><Icons.FileText size={19}/><strong>Your records</strong><span>Bring the pieces together</span></div><div><Icons.Calendar size={19}/><strong>Your plans</strong><span>Keep the next step in sight</span></div></div></> : <PreviewContent kind={selected === 1 ? 'passport' : 'timeline'}/>}
        </div><span className="mp-demo-footnote">Example interface only. No real patient information.</span>
      </div>
    </div>
  </div>;
};
