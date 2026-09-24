import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, UserCog } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { supabase } from '../lib/supabase.js';
import { ALL_ROLES, roleInfo } from '../lib/roles.js';
import { formatDate } from '../lib/auth.js';

export default function DeveloperDashboard({ session }) {
  const [stats, setStats] = useState({
    users: 0,
    roles: {},
    applications: 0,
    classes: 0,
    staff: 0,
    students: 0,
    recent: [],
  });

  useEffect(() => {
    void (async () => {
      const { data: users } = await supabase.from('profiles').select('id, role, full_name, email, created_at').order('created_at', { ascending: false }).limit(50);
      const { count: applications } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true });
      const { count: classes } = await supabase
        .from('classes')
        .select('id', { count: 'exact', head: true });
      const { count: staff } = await supabase
        .from('staff_records')
        .select('id', { count: 'exact', head: true });
      const { count: students } = await supabase
        .from('student_records')
        .select('id', { count: 'exact', head: true });

      const counts = { users: users?.length ?? 0, applications: applications ?? 0, classes: classes ?? 0, staff: staff ?? 0, students: students ?? 0, roles: {} };
      for (const role of ALL_ROLES) {
        counts.roles[role] = (users ?? []).filter((u) => u.role === role).length;
      }
      setStats({ ...counts, recent: (users ?? []).slice(0, 5) });
    })();
  }, []);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Total users" value={stats.users} icon={<Users size={20} />} tone="violet" delay={0} />
        <StatCard label="Students" value={stats.students} icon={<GraduationCap size={20} />} tone="emerald" delay={80} />
        <StatCard label="Classes" value={stats.classes} icon={<BookOpen size={20} />} tone="blue" delay={160} />
        <StatCard label="Staff" value={stats.staff} icon={<UserCog size={20} />} tone="amber" delay={240} />
      </div>

      <div className="card">
        <h3 className="card-title">Platform overview</h3>
        <div className="overview-stats">
          <div className="role-breakdown">
            {ALL_ROLES.map((role) => (
              <div key={role} className="role-row">
                <span className="role-name">
                  <span className="role-dot" style={{ background: roleInfo(role).color }} />
                  {role.replace('_', ' ')}
                </span>
                <span className="role-count">{stats.roles[role] ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="overview-side">
            <span className="ov-count">{stats.applications}</span>
            <span className="ov-label">Admission applications</span>
            <hr />
            <ul className="recent-list">
              {stats.recent.map((u) => (
                <li key={u.id}>
                  <span className="recent-name">{u.full_name || u.email}</span>
                  <em className="role-chip" style={{ background: roleInfo(u.role).soft, color: roleInfo(u.role).color }}>
                    {roleInfo(u.role).label}
                  </em>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="card-note">
          Full audit log & user management ship with the Level 5 developer portal.
        </p>
      </div>

      <RoadmapCard />
    </div>
  );
}