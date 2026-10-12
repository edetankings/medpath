import React, { useState, useEffect } from 'react';
import { Icons } from '../components/Icons';
import { Button, Field, Notice, ErrorState } from '../components/UI';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
interface AuthPageProps { initialMode?: 'signin' | 'signup' | 'forgot'; }
export const AuthPage: React.FC<AuthPageProps> = ({ initialMode='signin' }) => {
  const { navigate, showToast } = useApp(); const { login, register } = useAuth();
  const [mode,setMode]=useState(initialMode); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [name,setName]=useState('');
  const [showPassword,setShowPassword]=useState(false); const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  useEffect(() => { setMode(initialMode); setError(''); },[initialMode]);
  const switchMode = (next: typeof mode) => { setError(''); setMode(next); setPassword(''); setShowPassword(false); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (loading || mode==='forgot') return; setError(''); setLoading(true);
    try {
      if (mode==='signup') { if (!name.trim()) throw new Error('Please enter your full name.'); if(password.length<6) throw new Error('Use at least 6 characters.'); await register(name.trim(),email.trim(),password); }
      else await login(email.trim(),password);
      showToast(mode==='signup' ? 'Account created' : 'Welcome back', 'You are signed in to MedPath.', 'success'); navigate('dashboard');
    } catch(err: unknown) { setError(err instanceof Error ? err.message : 'Unable to sign in. Please try again.'); } finally { setLoading(false); }
  };
  return <main className="auth-page-wrapper ui-auth">
    <aside className="ui-auth-story"><a className="brand-logo" href="#home" onClick={e=>{e.preventDefault();navigate('home');}}><Icons.Logo size={32}/>MedPath.</a><div><span className="ui-eyebrow">YOUR PATH TO BETTER HEALTHCARE</span><h2>A little clarity.<br/>A more connected you.</h2><p>Your records, your plans and your next steps. A calmer place to bring them together.</p><div className="ui-auth-orbit" aria-hidden="true"><Icons.Passport size={54}/><span>YOUR HEALTHCARE PASSPORT</span><i/><b>Your story, together.</b></div></div><small>Navigation and organization. Always alongside professional care.</small></aside>
    <section className="auth-panel"><button className="btn btn-ghost ui-auth-back" onClick={()=>navigate('home')}><Icons.ArrowLeft size={16}/>Back to MedPath</button><span className="ui-eyebrow">{mode==='signup' ? 'YOUR JOURNEY STARTS HERE' : mode==='forgot' ? 'ACCOUNT ACCESS' : 'WELCOME BACK'}</span>
      <h1 className="auth-heading">{mode==='signin' ? 'Your next chapter.' : mode==='signup' ? 'Make room for your health.' : 'Password recovery'}</h1>
      <p className="auth-subheading">{mode==='signin' ? 'Sign in to pick up where you left off.' : mode==='signup' ? 'Create your account to organize the information that matters to you.' : 'Clear information about recovering access to your account.'}</p>
      {error && <ErrorState message={error}/>}
      {mode==='forgot' ? <><Notice title="Recovery and password reset are not available yet">This deployment has no configured recovery-email or password-reset workflow. No email has been sent. Contact the project owner through your existing support channel for help with access; never share your password.</Notice><Button variant="outline" onClick={()=>switchMode('signin')}>Return to sign in</Button></> : <form onSubmit={submit} aria-busy={loading}>
        {mode==='signup' && <Field label="Full name" autoComplete="name" value={name} onChange={e=>setName(e.target.value)} required disabled={loading}/>}
        <Field label="Email address" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required disabled={loading}/>
        <div className="form-group"><label className="form-label" htmlFor="auth-password">Password</label><div className="ui-password"><input id="auth-password" className="form-control" type={showPassword ? 'text' : 'password'} autoComplete={mode==='signup' ? 'new-password' : 'current-password'} minLength={mode==='signup' ? 6 : undefined} value={password} onChange={e=>setPassword(e.target.value)} required disabled={loading}/><button type="button" className="icon-button" onClick={()=>setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <Icons.EyeOff size={18}/> : <Icons.Eye size={18}/>}</button></div>{mode==='signup' && <small>Use at least 6 characters.</small>}</div>
        {mode==='signin' && <button className="nav-link-btn ui-forgot" type="button" onClick={()=>switchMode('forgot')}>Forgot password?</button>}
        <Button type="submit" className="btn-block" busy={loading}>{mode==='signin' ? 'Sign In' : 'Create Account'}<Icons.ArrowRight size={17}/></Button>
        <p className="ui-auth-switch">{mode==='signin' ? 'New to MedPath?' : 'Already have an account?'} <button disabled={loading} type="button" className="nav-link-btn" onClick={()=>switchMode(mode==='signin' ? 'signup' : 'signin')}>{mode==='signin' ? 'Create an account' : 'Sign in'}</button></p>
      </form>}<p className="ui-auth-footnote">Your information stays yours to organize. MedPath is not a substitute for professional medical care.</p>
    </section>
  </main>;
};
