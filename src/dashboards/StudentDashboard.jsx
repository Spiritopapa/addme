import { useEffect, useState } from 'react';
import { BookMarked, School, Hash, CalendarDays } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { formatDate } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export default function StudentDashboard({ session }) {
  const { profile } = session;
  const [data, setData] = useState({ record: null, class: null, applications: null });

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      const { data: record } = await supabase
        .from('student_records')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      let myClass = null;
      if (record?.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('*')
          .eq('id', record.class_id)
          .maybeSingle();
        myClass = cls;
      }

      const { data: applications } = profile?.email
        ? await supabase
            .from('students')
            .select('program, status, created_at, previous_gpa')
            .eq('email', profile.email)
            .order('created_at', { ascending: false })
        : { data: [] };

      setData({ record, class: myClass, applications: applications ?? [] });
    })();
  }, [profile?.id]);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="My class" value={data.class?.name ?? (data.record ? 'Unassigned' : '—')} icon={<School size={20} />} tone="violet" delay={0} />
        <StatCard label="Admission no" value={data.record?.admission_no?.replace('STD-', '') ?? '—'} icon={<Hash size={20} />} tone="blue" delay={80} />
        <StatCard label="Class teacher" value={data.class?.class_teacher_name ?? '—'} icon={<BookMarked size={20} />} tone="emerald" delay={160} />
        <StatCard label="Attendance" value="L3" icon={<CalendarDays size={20} />} tone="amber" delay={240} />
      </div>

      {data.record ? (
        <section className="card">
          <h3 className="card-title">My profile</h3>
          <ul className="kv-list">
            <li><span>Full name</span><strong>{data.record.full_name}</strong></li>
            <li><span>Admission number</span><strong>{data.record.admission_no}</strong></li>
            <li><span>Class</span><strong>{data.class?.name ?? 'Unassigned'} · {data.class?.academic_year ?? ''}</strong></li>
            <li><span>Class teacher</span><strong>{data.class?.class_teacher_name ?? '—'}</strong></li>
            <li><span>Guardian</span><strong>{data.record.guardian_name ?? '—'}</strong></li>
            <li><span>Enrolled</span><strong>{formatDate(data.record.enrollment_date)}</strong></li>
          </ul>
        </section>
      ) : (
        <section className="card">
          <h3 className="card-title">My profile</h3>
          <p className="card-note">
            No student record is linked to your account yet. A school admin links
            records on the <strong>Students</strong> page.
          </p>
        </section>
      )}

      <section className="card">
        <h3 className="card-title">My submissions</h3>
        {data.applications === null ? (
          <p className="card-note">Loading…</p>
        ) : data.applications.length === 0 ? (
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
              {data.applications.map((a) => (
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