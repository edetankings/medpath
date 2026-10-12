import React, { useEffect, useRef, useState } from 'react';
import { Icons } from '../components/Icons';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { RoutePath } from '../types';
import { DashboardPreview, PreviewContent, PreviewKind } from '../components/landing/ProductPreview';
import './LandingPage.css';

const journey = [
  { title: 'Tell Us What You Need', description: 'Start with a question, a concern, or simply a wish to feel more organized.', detail: 'You do not need to have all the answers. A question is enough to begin.', icon: Icons.Messages },
  { title: 'Understand Your Next Steps', description: 'Explore navigation guidance and prepare questions for a healthcare professional.', detail: 'Use guidance as a starting point for a conversation, never as a confirmed diagnosis or prescription.', icon: Icons.Compass },
  { title: 'Connect With Appropriate Care', description: 'Consider the kind of professional that fits your needs. Live discovery is in development.', detail: 'The goal is a clearer path to care. Provider discovery and direct booking are not available yet.', icon: Icons.MapPin },
  { title: 'Stay on Track', description: 'Keep your records, personal appointment plans, and health activity together.', detail: 'Return to your information when you need it, and build on the steps you have already taken.', icon: Icons.Timeline },
];
const features: { kind: PreviewKind; name: string; title: string; description: string; status: string; route: RoutePath; points: string[] }[] = [
  { kind: 'navigator', name: 'AI Healthcare Navigator', title: 'A clearer starting point.', description: 'Healthcare can bring unfamiliar questions. Explore general navigation guidance and prepare for a more informed conversation with a professional.', status: 'Guidance prototype', route: 'ai-navigator', points: ['Start with your own words', 'Prepare questions for a visit', 'Guidance, not a diagnosis or prescription'] },
  { kind: 'passport', name: 'Your Healthcare Passport', title: 'Your health story.\nAll together.', description: 'Give the information scattered across your life a place to belong. Organize the details and documents you choose to add, ready for your next conversation.', status: 'Personal records', route: 'passport', points: ['Medications, allergies and health history', 'Medical documents in one place', 'Add, review and remove your own records'] },
  { kind: 'care', name: 'Find Care', title: 'The right connection\nstarts with clarity.', description: 'We are building a way to explore care by specialty, location and personal preferences. A thoughtful next step toward a more connected healthcare journey.', status: 'In development', route: 'find-care', points: ['Provider discovery is being developed', 'No live availability or verified listings yet', 'For now, contact care providers directly'] },
  { kind: 'appointments', name: 'Appointments', title: 'Go into your next visit\na little more prepared.', description: 'Keep a personal record of your appointment plans and the details you want to remember. More context today. One less thing to keep in your head tomorrow.', status: 'Personal planning', route: 'appointments', points: ['Keep visit dates and notes together', 'Review your upcoming plans', 'Provider booking and reminders are planned'] },
  { kind: 'timeline', name: 'Health Timeline', title: 'A little perspective\non the bigger picture.', description: 'See activity from the records and plans you add to MedPath in one chronological view. Pick up the thread without starting your story all over again.', status: 'Record activity', route: 'timeline', points: ['Follow activity in your MedPath account', 'Bring context to your next conversation', 'Not a verified or complete clinical history'] },
];
const faqs = [
  ['What is MedPath?', 'MedPath is a healthcare navigation and personal record-organizing platform. It helps you keep information together and prepare for conversations about your care.'],
  ['Does MedPath diagnose conditions or prescribe treatment?', 'No. The Navigator is a guidance prototype, not a clinician. It does not provide confirmed diagnoses or prescriptions. For health decisions, speak with a qualified healthcare professional.'],
  ['Can I find and book a provider today?', 'Live provider discovery and direct booking are in development. The appointment area currently helps you keep personal visit plans; adding a plan does not book a visit with a provider.'],
  ['What can I keep in my Healthcare Passport?', 'You can add personal details, medications, allergies, health conditions and supported medical documents. Records are information you provide, not independently verified clinical records.'],
  ['Is MedPath connected to my hospital or care team?', 'Not yet. Hospital record integrations, care-team messaging, automatic sharing and reminders are not operational. MedPath does not automatically retrieve your medical records.'],
  ['What if I need urgent help?', 'Do not wait for a response from MedPath in an emergency. Contact your local emergency services or seek immediate in-person care.'],
];

export const LandingPage: React.FC = () => {
  const { navigate } = useApp();
  const { isAuthenticated, logout } = useAuth();
  const root = useRef<HTMLDivElement>(null);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scrollTo = (id: string) => {
    setMenuOpen(false);
    const target = document.getElementById(id);
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' });
  };
  const start = () => navigate(isAuthenticated ? 'dashboard' : 'signup');
  const openFeature = (route: RoutePath) => navigate(isAuthenticated ? route : 'signin');

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Set<Animation>();
    const observer = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer?.unobserve(entry.target);
        if (!media.matches && 'animate' in entry.target) {
          const animation = entry.target.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, easing: 'cubic-bezier(.2,.7,.2,1)', delay: Number((entry.target as HTMLElement).dataset.delay || 0) });
          animations.add(animation); animation.onfinish = () => animations.delete(animation);
        }
      });
    }, { threshold: 0.12 }) : null;
    root.current?.querySelectorAll('[data-reveal]').forEach(el => observer?.observe(el));
    let frame = 0;
    const onScroll = () => { if (frame) return; frame = requestAnimationFrame(() => {
      setScrolled(window.scrollY > 24);
      root.current?.style.setProperty('--mp-drift', `${media.matches ? 0 : Math.min(window.scrollY * .06, 30)}px`);
      frame = 0;
    }); };
    const onMotionChange = () => { if (media.matches) animations.forEach(a => a.cancel()); onScroll(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    media.addEventListener('change', onMotionChange); onScroll();
    return () => { observer?.disconnect(); animations.forEach(a => a.cancel()); window.removeEventListener('scroll', onScroll); media.removeEventListener('change', onMotionChange); cancelAnimationFrame(frame); };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && menuOpen) { setMenuOpen(false); menuToggle.current?.focus(); } };
    const onResize = () => { if (window.innerWidth > 800) setMenuOpen(false); };
    window.addEventListener('keydown', onKey); window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [menuOpen]);

  return <div className="mp-landing" ref={root}>
    <button className="mp-skip" onClick={() => scrollTo('mp-main')}>Skip to content</button>
    <header className={`mp-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="mp-container mp-nav-row"><a className="mp-brand" href="#home" aria-label="MedPath home" onClick={e => { e.preventDefault(); scrollTo('mp-main'); }}><Icons.Logo size={31}/><span>MedPath<span className="mp-brand-dot">.</span></span></a>
        <nav className="mp-desktop-nav" aria-label="Main navigation"><button onClick={() => scrollTo('mp-features')}>Features</button><button onClick={() => scrollTo('mp-journey')}>How It Works</button><button onClick={() => scrollTo('mp-about')}>About</button></nav>
        <div className="mp-nav-actions">{isAuthenticated ? <button className="mp-signin" onClick={async () => { await logout(); navigate('home'); }}>Sign Out</button> : <button className="mp-signin" onClick={() => navigate('signin')}>Sign In</button>}<button className="mp-button mp-button-small" onClick={start}>{isAuthenticated ? 'Dashboard' : 'Get Started'}<Icons.ArrowRight size={15}/></button><button className="mp-menu-toggle" ref={menuToggle} aria-expanded={menuOpen} aria-controls="mp-mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <Icons.Close/> : <Icons.Menu/>}</button></div>
      </div>
      <nav id="mp-mobile-menu" className="mp-mobile-nav" hidden={!menuOpen} aria-label="Mobile navigation"><button onClick={() => scrollTo('mp-features')}>Features<Icons.ArrowRight size={17}/></button><button onClick={() => scrollTo('mp-journey')}>How It Works<Icons.ArrowRight size={17}/></button><button onClick={() => scrollTo('mp-about')}>About<Icons.ArrowRight size={17}/></button><button onClick={() => { setMenuOpen(false); navigate(isAuthenticated ? 'dashboard' : 'signin'); }}>{isAuthenticated ? 'Your Dashboard' : 'Sign In'}<Icons.ArrowRight size={17}/></button></nav>
    </header>
    <main id="mp-main" tabIndex={-1}>
      <section className="mp-hero" aria-labelledby="mp-hero-title"><div className="mp-ambient" aria-hidden="true"/><div className="mp-container mp-hero-grid">
        <div className="mp-hero-copy"><span className="mp-eyebrow mp-hero-enter"><span className="mp-status-dot"/> A clearer path. A more connected you.</span><h1 id="mp-hero-title" aria-label="Your Path to Better Healthcare."><span>Your Path to</span><span className="mp-blue">Better</span><span className="mp-blue">Healthcare.</span></h1><p className="mp-hero-description mp-hero-enter">MedPath helps you understand your healthcare needs, organize your medical information and connect with appropriate healthcare professionals.</p><div className="mp-hero-buttons mp-hero-enter"><button className="mp-button" onClick={start}>Get Started<Icons.ArrowRight size={18}/></button><button className="mp-button mp-button-outline" onClick={() => scrollTo('mp-features')}>Explore MedPath<Icons.ArrowRight size={18}/></button></div><p className="mp-hero-caption mp-hero-enter"><span/>Built around your journey. At your own pace.</p></div>
        <div className="mp-hero-visual"><div className="mp-orbit mp-orbit-one" aria-hidden="true"/><div className="mp-orbit mp-orbit-two" aria-hidden="true"/><div className="mp-visual-label"><span className="mp-fine-line"/> YOUR HEALTH, WITH A LITTLE MORE CLARITY</div><DashboardPreview/><div className="mp-floating mp-float-record"><span className="mp-floating-icon"><Icons.FileText size={19}/></span><div><strong>Everything has a place.</strong><small>Your records, brought together.</small></div></div><div className="mp-floating mp-float-path"><span className="mp-floating-icon"><Icons.Compass size={19}/></span><div><strong>A thoughtful next step.</strong><small>Guidance for the journey ahead.</small></div></div><span className="mp-visual-caption">An interactive glimpse of MedPath - try the tabs above</span></div>
      </div></section>
      <div className="mp-principles mp-container" aria-label="Our approach"><div><Icons.User size={19}/><span>Designed around people</span></div><div><Icons.Compass size={19}/><span>Navigation, not diagnosis</span></div><div><Icons.Passport size={19}/><span>Your information, organized</span></div></div>

      <section id="mp-journey" className="mp-section mp-journey" tabIndex={-1} aria-labelledby="mp-journey-title"><div className="mp-container"><div className="mp-section-heading" data-reveal><span className="mp-eyebrow">FROM UNCERTAINTY TO A NEXT STEP</span><h2 id="mp-journey-title">Healthcare is a journey.<br /><span>Let&apos;s make it easier to navigate.</span></h2><p>You don&apos;t have to figure out every step at once. Start where you are.</p></div><div className="mp-journey-grid"><div className="mp-journey-track" aria-hidden="true"><span style={{ transform: `scaleX(${activeStep / 3})` }}/></div>{journey.map((step, i) => <button key={step.title} className={`mp-journey-card ${activeStep === i ? 'is-active' : ''}`} onClick={() => setActiveStep(i)} aria-pressed={activeStep === i} aria-controls="mp-journey-detail" data-reveal data-delay={i*70}><span className="mp-step-number">0{i+1}</span><span className="mp-journey-icon"><step.icon size={23}/></span><h3>{step.title}</h3><p>{step.description}</p><span className="mp-step-link">Explore this step<Icons.ArrowRight size={15}/></span></button>)}</div><div id="mp-journey-detail" className="mp-journey-detail" aria-live="polite"><span>STEP 0{activeStep+1}</span><p>{journey[activeStep].detail}</p></div></div></section>

      <section id="mp-features" className="mp-section mp-features" tabIndex={-1} aria-labelledby="mp-features-title"><div className="mp-container"><div className="mp-section-heading" data-reveal><span className="mp-eyebrow">A LITTLE LESS FRAGMENTED</span><h2 id="mp-features-title">The pieces of your healthcare.<br /><span>Finally, a place to come together.</span></h2></div>{features.map((feature, i) => <article key={feature.kind} className={`mp-feature mp-feature-${feature.kind} ${i%2 ? 'is-reversed' : ''}`}><div className="mp-feature-copy" data-reveal><span className="mp-feature-index">0{i+1} <span/>{feature.name}</span><h3>{feature.title}</h3><p>{feature.description}</p><ul>{feature.points.map(point => <li key={point}><Icons.Check size={16}/>{point}</li>)}</ul><button className="mp-text-button" onClick={() => openFeature(feature.route)}>Explore {feature.kind === 'passport' ? 'your Passport' : feature.name}<Icons.ArrowRight size={17}/></button></div><div className="mp-feature-scene" data-reveal><div className="mp-scene-header"><span className="mp-demo-badge">Illustrative preview</span><span className={`mp-feature-status ${feature.kind === 'care' ? 'is-planned' : ''}`}>{feature.status}</span></div><div className="mp-scene-inner"><PreviewContent kind={feature.kind}/></div></div></article>)}</div></section>

      <section id="mp-about" className="mp-section mp-about" tabIndex={-1} aria-labelledby="mp-about-title"><div className="mp-container mp-about-grid"><div data-reveal><span className="mp-eyebrow">WHY MEDPATH EXISTS</span><h2 id="mp-about-title">Healthcare is personal.<br /><span>Finding your way<br />should feel that way, too.</span></h2></div><div className="mp-about-copy" data-reveal><span className="mp-about-cross" aria-hidden="true"><Icons.Logo size={42}/></span><p>Between a question, an appointment and a folder of records, it&apos;s easy to lose the thread.</p><p>MedPath exists to help bring those pieces together. A calmer place to organize what matters, understand your options and prepare for the next conversation.</p><strong>Less to keep in your head.<br />More room to focus on you.</strong></div></div></section>
      <section id="mp-privacy" className="mp-section mp-privacy" tabIndex={-1} aria-labelledby="mp-privacy-title"><div className="mp-container mp-privacy-panel" data-reveal><div><span className="mp-privacy-icon"><Icons.UserCheck size={27}/></span><span className="mp-eyebrow">PRIVACY & PATIENT CONTROL</span><h2 id="mp-privacy-title">Your records.<br />Your context. Your decisions.</h2><p>Being clear about what a platform can do is part of earning your trust.</p></div><div className="mp-privacy-points"><div><span>01</span><section><h3>Choose what you add</h3><p>Organize the information and documents you want to keep in your account.</p></section></div><div><span>02</span><section><h3>Keep your information current</h3><p>Review your details and remove records you no longer want stored.</p></section></div><div><span>03</span><section><h3>Know what is available</h3><p>Automatic provider sharing and hospital integrations are not available. Storage protections depend on deployment.</p></section></div></div></div></section>
      <section id="mp-faq" className="mp-section mp-faq" tabIndex={-1} aria-labelledby="mp-faq-title"><div className="mp-container mp-faq-grid"><div data-reveal><span className="mp-eyebrow">A FEW THINGS YOU MIGHT WONDER</span><h2 id="mp-faq-title">A little more clarity.</h2><p>Straightforward answers.<br />Because your health deserves them.</p></div><div className="mp-faq-list" data-reveal>{faqs.map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true"><Icons.Plus size={18}/></span></summary><p>{a}</p></details>)}</div></div></section>
      <section className="mp-final" aria-labelledby="mp-final-title"><div className="mp-container" data-reveal><div className="mp-final-mark" aria-hidden="true"><Icons.Logo size={44}/></div><span className="mp-eyebrow">YOUR NEXT CHAPTER STARTS HERE</span><h2 id="mp-final-title">A clearer path.<br /><span>A little more peace of mind.</span></h2><p>Take the first step toward a more organized healthcare journey.</p><button className="mp-button" onClick={start}>Get Started<Icons.ArrowRight size={18}/></button><span className="mp-final-note">At your pace. With your story at the center.</span></div></section>
    </main>
    <footer className="mp-footer"><div className="mp-container"><div className="mp-footer-top"><div><a className="mp-brand" href="#home" onClick={e => { e.preventDefault(); scrollTo('mp-main'); }}><Icons.Logo size={30}/>MedPath<span className="mp-brand-dot">.</span></a><p>A more connected way to navigate<br />your healthcare journey.</p></div><div><h3>Explore</h3><button onClick={() => scrollTo('mp-features')}>Features</button><button onClick={() => scrollTo('mp-journey')}>How It Works</button><button onClick={() => scrollTo('mp-about')}>Why MedPath</button></div><div><h3>Your journey</h3><button onClick={() => openFeature('passport')}>Healthcare Passport</button><button onClick={() => openFeature('ai-navigator')}>Healthcare Navigator</button><button onClick={() => openFeature('appointments')}>Appointments</button></div><div><h3>Good to know</h3><button onClick={() => scrollTo('mp-privacy')}>Privacy & Patient Control</button><button onClick={() => scrollTo('mp-faq')}>Frequently Asked Questions</button><button onClick={() => navigate('signin')}>Sign In</button></div></div><div className="mp-footer-bottom"><span>&copy; {new Date().getFullYear()} MedPath. Your path to better healthcare.</span><p>Not a substitute for professional medical care. In an emergency, contact your local emergency services.</p></div></div></footer>
  </div>;
};
