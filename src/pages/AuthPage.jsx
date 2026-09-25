import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Sparkles, LogIn, ArrowRight, KeyRound, Crown } from 'lucide-react';
import { signIn, signUp } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

const MODES = { SIGN_IN: 'signin', SIGN_UP: 'signup' };

export default function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState(MODES.SIGN_IN);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', regCode: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  // True when no developer account exists → the next sign-up becomes the owner
  // (fresh install or the owner was deleted) and needs no registration code.
  const [setupMode, setSetupMode] = useState(null);

  useEffect(() => {
    void supabase.rpc('should_bootstrap_owner').then(({ data }) => setSetupMode(!!data));
  }, []);

  const update = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
    setMessage(null);
  };

  const switchMode = (next) => {
    setMode(next);
    setMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (mode === MODES.SIGN_IN) {
      setBusy(true);
      const { error } = await signIn(form.email, form.password);
      setBusy(false);
      if (error) {
        setMessage({
          type: 'error',
          text: error.message ?? 'Could not sign in. Check your credentials.',
        });
        return;
      }
      navigate('/app');
      return;
    }

    // ── sign up ────────────────────────────────────────────────────
    if (form.fullName.trim().length < 2) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }
    if (form.password.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setBusy(true);
    const { error } = await signUp({
      email: form.email,
      password: form.password,
      fullName: form.fullName,
      regCode: form.regCode,
    });
    setBusy(false);

    if (error) {
      setMessage({ type: 'error', text: error.message ?? 'Sign up failed. Please try again.' });
      return;
    }
    setMessage({
      type: 'success',
      text: 'Account created! If you did not get a session, check your inbox to confirm your email, then sign in.',
    });
    navigate('/app');
  };

  return (
    <div className="auth-page">
      <div className="auth-blobs" aria-hidden="true"><span /><span /></div>

      <div className="auth-card-wrapper">
        <Link to="/" className="auth-logo">
          <span>✦</span> EduSphere
        </Link>

        <div className="auth-card">
          <div className="auth-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === MODES.SIGN_IN}
              className={`auth-tab ${mode === MODES.SIGN_IN ? 'active' : ''}`}
              onClick={() => switchMode(MODES.SIGN_IN)}
            >
              <LogIn size={15} /> Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === MODES.SIGN_UP}
              className={`auth-tab ${mode === MODES.SIGN_UP ? 'active' : ''}`}
              onClick={() => switchMode(MODES.SIGN_UP)}
            >
              <Sparkles size={15} /> Create account
            </button>
          </div>

          {message && (
            <div className={`banner banner-${message.type}`} role="status">
              {message.text}
            </div>
          )}

          {/* ── form body ───────────────────────────────────────────── */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === MODES.SIGN_UP && (
              <>
                {setupMode === true && (
                  <div className="banner banner-warning owner-setup" role="status">
                    <Crown size={15} /> Setup / recovery mode — no owner account
                    exists. The next account created becomes the app{' '}
                    <strong>developer</strong> and does not need a registration code.
                  </div>
                )}
                <div className="field">
                  <label htmlFor="fullName">Full name</label>
                  <div className="input-icon">
                    <User size={16} />
                    <input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Ama Serwaa"
                      value={form.fullName}
                      onChange={update('fullName')}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="regCode">
                    {setupMode === true ? 'Registration code (not required now)' : 'School registration code'}
                  </label>
                  <div className="input-icon">
                    <KeyRound size={16} />
                    <input
                      id="regCode"
                      type="text"
                      autoComplete="off"
                      spellCheck="false"
                      placeholder="EDU-XXXXXX"
                      value={form.regCode}
                      onChange={update('regCode')}
                      required={setupMode !== true}
                    />
                  </div>
                  <p className="field-hint">
                    {setupMode === true
                      ? 'You are creating the owner account — no code needed. Set up school admin codes next from your dashboard.'
                      : 'Asked to join? Your school admin (or the app owner) gives you a one-time code. Roles are never self-selected.'}
                  </p>
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <div className="input-icon">
                <Mail size={16} />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="input-icon">
                <Lock size={16} />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === MODES.SIGN_IN ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={update('password')}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy
                ? 'Please wait…'
                : mode === MODES.SIGN_IN
                  ? 'Sign in'
                  : 'Create account'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="auth-footnote">
          Protected by Supabase Auth + Row Level Security.
        </p>
      </div>
    </div>
  );
}