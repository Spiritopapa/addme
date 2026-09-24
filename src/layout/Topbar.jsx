import { useLocation } from 'react-router-dom';
import { Menu, Bell, LogOut, ShieldCheck } from 'lucide-react';
import { userInitials, firstName } from '../lib/auth.js';
import { roleInfo } from '../lib/roles.js';

const TITLES = {
  '/app/applications': 'Applications',
  '/app/users': 'User directory',
  '/app/settings': 'Settings',
};

export default function Topbar({ session, onMenu, onSignOut }) {
  const location = useLocation();
  const { profile } = session;
  const meta = roleInfo(profile?.role);
  const title = TITLES[location.pathname] ?? 'Dashboard';
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="topbar">
      <button
        type="button"
        className="icon-btn topbar-burger"
        aria-label="Open navigation"
        onClick={onMenu}
      >
        <Menu size={20} />
      </button>

      <div className="topbar-title">
        <h2>{title}</h2>
        <p>{today}</p>
      </div>

      <div className="topbar-actions">
        <span className="topbar-security">
          <ShieldCheck size={14} /> RLS
        </span>
        <button type="button" className="icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" />
        </button>
        <div className="topbar-avatar">
          <span
            className="avatar-sm"
            style={{ background: meta.soft, color: meta.color }}
            aria-hidden="true"
          >
            {userInitials(profile?.full_name)}
          </span>
          <div className="topbar-avatar-meta">
            <p>{firstName(profile?.full_name) || '—'}</p>
            <span>{meta.label}</span>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label="Sign out"
          title="Sign out"
          onClick={onSignOut}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}