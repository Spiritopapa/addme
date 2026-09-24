import { useEffect, useState } from 'react';
import { UserRound, ClipboardList, Users, FileText } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export default function AdminDashboard({ session }) {
  const [data, setData] = useState({ users: 0, pending: 0, recent: [] });

  const load = async () => {
    const { data: users } = await supabase.from('profiles').select('id');
    const { data: pending, count } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    setData({
      users: users?.length ?? 0,
      pending: count ?? pending?.length ?? 0,
      recent: pending ?? [],
    });
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Pending applications" value={data.pending} icon={<ClipboardList size={20} />} tone="amber" delay={0} />
        <StatCard label="Registered users" value={data.users} icon={<Users size={20} />} tone="blue" delay={80} />
        <StatCard label="Role portals" value={5} icon={<UserRound size={20} />} tone="violet" delay={160} />
        <StatCard label="Module" value="Live" icon={<FileText size={20} />} tone="emerald" delay={240} />
      </div>

      <section className="card">
        <h3 className="card-title">Latest applications</h3>
        {data.recent.length === 0 ? (
          <p className="card-note">No pending applications right now. Share the <strong>/apply</strong> link!</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Program</th>
                <th>GPA</th>
                <th>Applied</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="cell-avatar">{userInitials(s.full_name)}</span>
                    {s.full_name}
                  </td>
                  <td>{s.program}</td>
                  <td>{s.previous_gpa ?? '—'}</td>
                  <td>{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="card-note">
          Review & decide applications in the <strong>Applications</strong> module.
        </p>
      </section>

      <RoadmapCard compact />
    </div>
  );
}