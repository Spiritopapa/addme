import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import { signOut } from '../lib/auth.js';

export default function AppShell({ session, pageKey }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  const handleSignOut = async () => {
    await signOut();
    // useSession() reacts to SIGNED_OUT and App.jsx redirects to /auth
  };

  return (
    <div className="app-shell">
      {/* ── Sidebar (permanent on desktop, drawer on mobile) ─────── */}
      <div className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <Sidebar session={session} onNavigate={closeDrawer} />
      </div>
      <div
        className={`sidebar-backdrop ${drawerOpen ? 'show' : ''}`}
        role="presentation"
        onClick={closeDrawer}
      />

      <div className="app-main">
        <Topbar session={session} onMenu={() => setDrawerOpen(true)} onSignOut={handleSignOut} />

        {/* key={pageKey} remounts on navigation → replays entrance animation */}
        <main key={pageKey} className="page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}