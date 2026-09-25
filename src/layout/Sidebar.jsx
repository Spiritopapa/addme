import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  WalletCards,
  Settings,
  Lock,
  ShieldCheck,
  UserCog,
  Clock,
  Megaphone,
  ClipboardList,
  CalendarCheck,
  Puzzle,
  Rocket,
} from 'lucide-react';
import { userInitials } from '../lib/auth.js';
import { ROLE_ADMIN, ROLE_STAFF, ROLE_DEVELOPER, roleInfo } from '../lib/roles.js';

const COMING_SOON = [
  { label: 'Reports & exports', icon: Puzzle, level: 'Level 5' },
  { label: 'Audit log', icon: ShieldCheck, level: 'Level 5' },
  { label: 'System health', icon: Rocket, level: 'Level 5' },
];

export default function Sidebar({ session, onNavigate }) {
  const { profile } = session;
  const location = useLocation();
  const role = profile?.role;
  const meta = roleInfo(role);
  const onAppSub = (path) => (location.pathname === `/app${path}`) ||
    (path === '' && location.pathname === '/app');

  const primaryItems = [
    { label: 'Dashboard', to: '/app', icon: LayoutDashboard, show: true },
    {
      label: 'Applications',
      to: '/app/applications',
      icon: FileText,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L1',
    },
    {
      label: 'Students',
      to: '/app/students',
      icon: GraduationCap,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L2',
    },
    {
      label: 'Classes',
      to: '/app/classes',
      icon: BookOpen,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L2',
    },
    {
      label: 'Staff',
      to: '/app/staff',
      icon: UserCog,
      show: role === ROLE_ADMIN || role === ROLE_DEVELOPER,
      badge: 'L2',
    },
    {
      label: 'Subjects',
      to: '/app/subjects',
      icon: BookOpen,
      show: role === ROLE_ADMIN || role === ROLE_DEVELOPER,
      badge: 'L3',
    },
    {
      label: 'Grades',
      to: '/app/grades',
      icon: ClipboardList,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L3',
    },
    {
      label: 'Attendance',
      to: '/app/attendance',
      icon: CalendarCheck,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L3',
    },
    {
      label: 'Timetable',
      to: '/app/timetable',
      icon: Clock,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L3',
    },
    {
      label: 'Fees & payments',
      to: '/app/fees',
      icon: WalletCards,
      show: role === ROLE_ADMIN || role === ROLE_DEVELOPER,
      badge: 'L4',
    },
    {
      label: 'Announcements',
      to: '/app/announcements',
      icon: Megaphone,
      show: role === ROLE_ADMIN || role === ROLE_STAFF || role === ROLE_DEVELOPER,
      badge: 'L4',
    },
    {
      label: 'User directory',
      to: '/app/users',
      icon: Users,
      show: role === ROLE_DEVELOPER,
      badge: 'Dev',
    },
  ].filter((item) => item.show);

  return (
    <aside className="sidebar-inner">
      <Link to="/" className="sidebar-brand" aria-label="EduSphere home">
        <span className="sidebar-logo">✦</span>
        <span className="sidebar-brand-name">EduSphere</span>
      </Link>

      <div className="sidebar-user">
        <span className="avatar-sm" style={{ background: meta.soft, color: meta.color }}>
          {userInitials(profile?.full_name)}
        </span>
        <div className="sidebar-user-meta">
          <p className="sidebar-user-name">{profile?.full_name ?? '—'}</p>
          <span className="role-chip" style={{ color: meta.color, background: meta.soft }}>
            {meta.label}
          </span>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main">
        <p className="sidebar-label">Menu</p>
        <ul>
          {primaryItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-item ${onAppSub(item.to === '/app' ? '' : item.to.replace('/app', '')) ? 'active' : ''}`}
                onClick={onNavigate}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge && <em className="nav-badge">{item.badge}</em>}
              </Link>
            </li>
          ))}
        </ul>

        <p className="sidebar-label">Coming soon</p>
        <ul>
          {COMING_SOON.map((item) => (
            <li key={item.label}>
              <span className="nav-item disabled" aria-disabled="true">
                <Lock size={15} />
                <span>{item.label}</span>
                <em className="nav-badge muted">{item.level}</em>
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        <Link to="/app/settings" className="nav-item" onClick={onNavigate}>
          <Settings size={18} />
          <span>Settings</span>
        </Link>
        <p className="sidebar-security">
          <ShieldCheck size={13} /> RLS enforced
        </p>
      </div>
    </aside>
  );
}