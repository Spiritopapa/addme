import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ShieldCheck,
  BarChart3,
  WalletCards,
  ArrowRight,
  Rocket,
} from 'lucide-react';
import { ROLES } from '../lib/roles.js';
import { firstName } from '../lib/auth.js';

const ALL_ROLE_KEYS = ['developer', 'school_admin', 'staff', 'student', 'parent'];

const FEATURES = [
  {
    icon: GraduationCap,
    title: 'Role portals',
    text: 'Dedicated dashboards for developers, admins, staff, students & parents — each locked by RLS.',
  },
  {
    icon: ShieldCheck,
    title: 'RLS secured',
    text: 'Row Level Security policies keep every role inside the exact data it is allowed to see.',
  },
  {
    icon: BarChart3,
    title: 'Academics',
    text: 'Classes, grades, attendance & timetables arriving level by level.',
  },
  {
    icon: WalletCards,
    title: 'Finance',
    text: 'Fees, payments & receipts for students and parents.',
  },
];

export default function Landing({ session }) {
  const { user, profile } = session;
  const roleData = profile?.role ? ROLES[profile.role] : null;

  return (
    <div className="landing">
      <div className="landing-blobs" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      {/* ── Public top bar ─────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-brand">
          <span className="landing-logo">✦</span> EduSphere
        </div>
        <nav className="landing-links">
          <Link to="/apply" className="landing-link">Apply</Link>
          {user ? (
            <Link to="/app" className="btn btn-primary btn-sm">
              Open dashboard
            </Link>
          ) : (
            <Link to="/auth" className="btn btn-primary btn-sm">
              Sign in
            </Link>
          )}
        </nav>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-eyebrow">
            <span className="pulse-dot" /> Level 1 · Auth & role portals
          </p>
          <h1>
            One school. <span className="hero-accent">Five portals.</span>
            <br />
            Zero chaos.
          </h1>
          <p className="hero-sub">
            EduSphere is a modern school management system — responsive on every
            device, alive with transitions, and secured end-to-end with
            Supabase Row Level Security.
          </p>
          <div className="hero-actions">
            <Link to="/auth" className="btn btn-primary btn-lg">
              Get started <ArrowRight size={18} />
            </Link>
            <Link to="/apply" className="btn btn-ghost btn-lg">
              Apply for admission
            </Link>
          </div>
        </div>

        <div className="hero-card" aria-hidden="true">
          <div className="hero-card-head">
            <span className="hero-dot red" />
            <span className="hero-dot amber" />
            <span className="hero-dot green" />
            <span className="hero-card-title">edusphere.app</span>
          </div>
          <div className="hero-card-body">
            <div className="hero-stat">
              <span>Pending applications</span>
              <strong>12</strong>
            </div>
            <div className="hero-stat">
              <span>Daily attendance</span>
              <strong>96%</strong>
            </div>
            <div className="hero-bar">
              {[42, 68, 55, 84, 61, 92, 74, 88, 97, 70, 80, 64].map((h, i) => (
                <span key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Role portals ───────────────────────────────────────────── */}
      <section className="landing-section">
        <h2 className="landing-h2">Every user, their own portal</h2>
        <div className="role-grid">
          {ALL_ROLE_KEYS.map((key, i) => {
            const meta = ROLES[key];
            return (
              <article
                key={key}
                className="role-card"
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <span
                  className="role-avatar"
                  style={{ background: meta.soft, color: meta.color }}
                >
                  {key[0].toUpperCase()}
                </span>
                <div>
                  <h3>{meta.label}</h3>
                  <p>{meta.blurb}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="landing-section">
        <h2 className="landing-h2">Built for schools that move fast</h2>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="feature-card">
              <span className="feature-icon">
                <f.icon size={22} />
              </span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="landing-cta">
        <h2>Ready when you are.</h2>
        <p className="landing-muted">
          {roleData && user
            ? `Welcome back, ${firstName(profile.full_name)} — your ${roleData.label.toLowerCase()} portal is waiting.`
            : 'Create a free account to open your portal. No credit card required.'}
        </p>
        {user ? (
          <Link to="/app" className="btn btn-primary btn-lg">
            Open my portal <Rocket size={18} />
          </Link>
        ) : (
          <Link to="/auth" className="btn btn-primary btn-lg">
            Create an account
          </Link>
        )}
      </section>

      <footer className="landing-footer">
        EduSphere · React + Supabase RLS · Deployed on Vercel · Level 1 — live
      </footer>
    </div>
  );
}