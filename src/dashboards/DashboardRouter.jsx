import {
  ROLE_DEVELOPER,
  ROLE_ADMIN,
  ROLE_STAFF,
  ROLE_STUDENT,
  ROLE_PARENT,
  ROLES,
} from '../lib/roles.js';
import DeveloperDashboard from './DeveloperDashboard.jsx';
import AdminDashboard from './AdminDashboard.jsx';
import StaffDashboard from './StaffDashboard.jsx';
import StudentDashboard from './StudentDashboard.jsx';
import ParentDashboard from './ParentDashboard.jsx';

export default function DashboardRouter({ session }) {
  const role = session.profile?.role;
  switch (role) {
    case ROLE_DEVELOPER:
      return <DeveloperDashboard session={session} />;
    case ROLE_ADMIN:
      return <AdminDashboard session={session} />;
    case ROLE_STAFF:
      return <StaffDashboard session={session} />;
    case ROLE_PARENT:
      return <ParentDashboard session={session} />;
    case ROLE_STUDENT:
    default:
      return <StudentDashboard session={session} />;
  }
}