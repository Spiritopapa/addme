import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/auth.js';
import { supabaseConfigured } from './lib/supabase.js';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ApplyPage from './pages/ApplyPage.jsx';
import AppShell from './layout/AppShell.jsx';
import SettingsPlaceholder from './pages/SettingsPlaceholder.jsx';
import LoadingScreen from './components/ui/LoadingScreen.jsx';
import DashboardRouter from './dashboards/DashboardRouter.jsx';
import ApplicationsView from './dashboards/ApplicationsView.jsx';
import UsersDirectory from './dashboards/UsersDirectory.jsx';

export default function App() {
  const location = useLocation();
  const { user, profile, loading } = useSession();

  // Route transition — key the shell so it re-runs its entrance animation.
  const pageKey = `${location.pathname} ${location.hash}`;

  if (loading) {
    return <LoadingScreen />;
  }

  const session = { user, profile };

  return (
    <Routes>
      <Route path="/" element={<Landing session={session} />} />
      <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <AuthPage />} />
      <Route
        path="/apply"
        element={supabaseConfigured ? <ApplyPage /> : <Landing session={session} />}
      />
      <Route
        path="/app"
        element={user ? <AppShell session={session} pageKey={pageKey} /> : <Navigate to="/auth" replace />}
      >
        <Route index element={<DashboardRouter session={session} />} />
        <Route path="applications" element={<ApplicationsView session={session} />} />
        <Route path="users" element={<UsersDirectory session={session} />} />
        <Route path="settings" element={<SettingsPlaceholder />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}