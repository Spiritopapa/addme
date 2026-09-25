import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSession } from './lib/auth.js';
import { supabaseConfigured } from './lib/supabase.js';
import { canSeeStudents, canSeeClasses, canSeeStaff, canSeeAcademics, canSeeSubjects, canSeeFees, canSeeAnnouncements, canSeeDeveloper, canSeeUsersAdmin } from './lib/roles.js';
import Landing from './pages/Landing.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ApplyPage from './pages/ApplyPage.jsx';
import AppShell from './layout/AppShell.jsx';
import SettingsPlaceholder from './pages/SettingsPlaceholder.jsx';
import SuspendedScreen from './pages/SuspendedScreen.jsx';
import LoadingScreen from './components/ui/LoadingScreen.jsx';
import DashboardRouter from './dashboards/DashboardRouter.jsx';
import ApplicationsView from './dashboards/ApplicationsView.jsx';
import UsersDirectory from './dashboards/UsersDirectory.jsx';
import StudentsView from './dashboards/StudentsView.jsx';
import ClassesView from './dashboards/ClassesView.jsx';
import StaffView from './dashboards/StaffView.jsx';
import SubjectsView from './dashboards/SubjectsView.jsx';
import GradesView from './dashboards/GradesView.jsx';
import AttendanceView from './dashboards/AttendanceView.jsx';
import TimetableView from './dashboards/TimetableView.jsx';
import FeesView from './dashboards/FeesView.jsx';
import AnnouncementsView from './dashboards/AnnouncementsView.jsx';
import DeveloperPortal from './dashboards/DeveloperPortal.jsx';
import UserAdminView from './dashboards/UserAdminView.jsx';

export default function App() {
  const location = useLocation();
  const { user, profile, loading, suspended } = useSession();

  // Route transition — key the shell so it re-runs its entrance animation.
  const pageKey = `${location.pathname} ${location.hash}`;

  if (loading) {
    return <LoadingScreen />;
  }

  if (suspended) {
    return <SuspendedScreen />;
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
        <Route
          path="students"
          element={canSeeStudents(user) ? <StudentsView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="classes"
          element={canSeeClasses(user) ? <ClassesView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="staff"
          element={canSeeStaff(user) ? <StaffView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="subjects"
          element={canSeeSubjects(user) ? <SubjectsView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="grades"
          element={canSeeAcademics(user) ? <GradesView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="attendance"
          element={canSeeAcademics(user) ? <AttendanceView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="timetable"
          element={canSeeAcademics(user) ? <TimetableView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="fees"
          element={canSeeFees(user) ? <FeesView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="announcements"
          element={canSeeAnnouncements(user) ? <AnnouncementsView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="developer"
          element={canSeeDeveloper(user) ? <DeveloperPortal session={session} /> : <Navigate to="/app" replace />}
        />
        <Route
          path="users-admin"
          element={canSeeUsersAdmin(user) ? <UserAdminView session={session} /> : <Navigate to="/app" replace />}
        />
        <Route path="users" element={<UsersDirectory session={session} />} />
        <Route path="settings" element={<SettingsPlaceholder />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}