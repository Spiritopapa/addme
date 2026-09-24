import { useEffect, useState } from 'react';
import { UserRound, ClipboardList, Users, BookOpen, UserCog, GraduationCap } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export default function AdminDashboard({ session }) {
  const [data, setData] = useState({ classes: 0, staff: 0, students: 0, pending: 0, recent: [] });

  const load = async () => {
    const { data: classes } = await supabase.from('classes').select('id');
    const { data: staff } = await supabase.from('staff_records').select('id');
    const { data: students } = await supabase.from('student_records').select('id');
    const { data: pending, count } = await supabase
      .from('students')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5);
    setData({
      classes: classes?.length ?? 0,
      staff: staff?.length ?? 0,
      students: students?.length ?? 0,
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
        <StatCard label="Students" value={data.students} icon={<GraduationCap size={20} />} tone="blue" delay={0} />
        <StatCard label="Classes" value={data.classes} icon={<BookOpen size={20} />} tone="violet" delay={80} />
        <StatCard label="Staff" value={data.staff} icon={<UserCog size={20} />} tone="emerald" delay={160} />
        <StatCard label="Pending applications" value={data.pending} icon={<ClipboardList size={20} />} tone="amber" delay={240} />
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
          Manage classes, staff and the student roster from the sidebar.
        </p>
      </section>

      <RoadmapCard compact />
    </div>
  );
}