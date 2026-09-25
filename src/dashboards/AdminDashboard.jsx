import { useEffect, useState } from 'react';
import { UserRound, ClipboardList, Users, BookOpen, UserCog, GraduationCap, Activity, Trophy } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { letterFor, avgScore } from '../lib/grades.js';
import { supabase } from '../lib/supabase.js';

function todayStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function AdminDashboard({ session }) {
  const [data, setData] = useState({
    classes: 0, staff: 0, students: 0, pending: 0, recent: [],
    attPct: null, avgGrade: null,
  });

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
    const { data: attToday } = await supabase
      .from('attendance')
      .select('status')
      .eq('date', todayStr());
    const { data: allGrades } = await supabase.from('grades').select('score');

    const marked = (attToday ?? []).filter((a) => a.status !== 'excused');
    const presentCount = marked.filter((a) => a.status === 'present').length;

    setData({
      classes: classes?.length ?? 0,
      staff: staff?.length ?? 0,
      students: students?.length ?? 0,
      pending: count ?? pending?.length ?? 0,
      recent: pending ?? [],
      attPct: marked.length ? Math.round((presentCount / marked.length) * 100) : null,
      avgGrade: avgScore(allGrades ?? []),
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

      <div className="stat-grid stat-grid-sm">
        <StatCard label="Today’s attendance" value={data.attPct != null ? `${data.attPct}%` : '—'} icon={<Activity size={18} />} tone="violet" delay={0} />
        <StatCard label="Average grade" value={data.avgGrade != null ? `${data.avgGrade}% (${letterFor(data.avgGrade)})` : '—'} icon={<Trophy size={18} />} tone="emerald" delay={80} />
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
          Grades, attendance & timetable links live in the sidebar.
        </p>
      </section>

      <RoadmapCard compact />
    </div>
  );
}