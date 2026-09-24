import { useEffect, useState } from 'react';
import { BookMarked, GraduationCap, HeartHandshake, WalletCards } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { formatDate } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export default function StudentDashboard({ session }) {
  const { profile } = session;
  const [myApplications, setMyApplications] = useState(null);

  useEffect(() => {
    if (!profile?.email) return;
    void (async () => {
      const { data } = await supabase
        .from('students')
        .select('program, status, created_at, previous_gpa')
        .eq('email', profile.email)
        .order('created_at', { ascending: false });
      setMyApplications(data ?? []);
    })();
  }, [profile?.email]);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="My applications" value={myApplications?.length ?? '…'} icon={<BookMarked size={20} />} tone="emerald" delay={0} />
        <StatCard label="My GPA" value="L3" icon={<GraduationCap size={20} />} tone="violet" delay={80} />
        <StatCard label="Attendance" value="L3" icon={<HeartHandshake size={20} />} tone="blue" delay={160} />
        <StatCard label="Fees" value="L4" icon={<WalletCards size={20} />} tone="amber" delay={240} />
      </div>

      <section className="card">
        <h3 className="card-title">My submissions</h3>
        {myApplications === null ? (
          <p className="card-note">Loading…</p>
        ) : myApplications.length === 0 ? (
          <p className="card-note">
            You haven’t submitted an admission application yet. Head to the{' '}
            <strong>/apply</strong> page to get started.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Program</th>
                <th>GPA</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {myApplications.map((a) => (
                <tr key={a.created_at}>
                  <td>{a.program}</td>
                  <td>{a.previous_gpa ?? '—'}</td>
                  <td>
                    <span className={`badge badge-${a.status}`}>{a.status}</span>
                  </td>
                  <td>{formatDate(a.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <RoadmapCard compact />
    </div>
  );
}