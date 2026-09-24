import { useEffect, useState } from 'react';
import { Users, FileText, ShieldCheck, Clock } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { supabase } from '../lib/supabase.js';
import { ALL_ROLES, roleInfo } from '../lib/roles.js';
import { formatDate } from '../lib/auth.js';

export default function DeveloperDashboard({ session }) {
  const [stats, setStats] = useState({ users: 0, roles: {}, applications: 0, staff: 0 });

  useEffect(() => {
    void (async () => {
      const { data: users } = await supabase.from('profiles').select('id, role');
      const { count: applications } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true });
      const counts = { users: users?.length ?? 0, applications: applications ?? 0, roles: {} };
      for (const role of ALL_ROLES) {
        counts.roles[role] = (users ?? []).filter((u) => u.role === role).length;
      }
      setStats(counts);
    })();
  }, []);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Total users" value={stats.users} icon={<Users size={20} />} tone="violet" delay={0} />
        <StatCard label="Applications" value={stats.applications} icon={<FileText size={20} />} tone="blue" delay={80} />
        <StatCard label="Roles live" value={ALL_ROLES.length} icon={<ShieldCheck size={20} />} tone="emerald" delay={160} />
        <StatCard label="Deployments" value="Live" icon={<Clock size={20} />} tone="amber" delay={240} />
      </div>

      <div className="card">
        <h3 className="card-title">Platform overview</h3>
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
        <p className="card-note">
          Full audit log & user management arrive with the Level 5 developer portal.
        </p>
      </div>

      <RoadmapCard />
    </div>
  );
}