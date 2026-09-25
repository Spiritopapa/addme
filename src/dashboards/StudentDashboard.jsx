import { useEffect, useState } from 'react';
import { BookMarked, School, CalendarDays, Trophy } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { letterFor, LETTER_COLORS, avgScore, attendanceRate } from '../lib/grades.js';
import { supabase } from '../lib/supabase.js';

const money = (v) => Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function StudentDashboard({ session }) {
  const { profile } = session;
  const [data, setData] = useState({
    record: null,
    class: null,
    grades: [],
    subjects: [],
    attendance: [],
    timetable: [],
    fees: [],
    announcements: [],
  });

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      const { data: record } = await supabase
        .from('student_records')
        .select('*')
        .eq('profile_id', profile.id)
        .maybeSingle();

      let myClass = null;
      let grades = [];
      let subjects = [];
      let attendance = [];
      let timetable = [];

      if (record?.class_id) {
        const { data: cls } = await supabase
          .from('classes')
          .select('*')
          .eq('id', record.class_id)
          .maybeSingle();
        myClass = cls;
        const { data: tt } = await supabase
          .from('timetable')
          .select('*')
          .eq('class_id', record.class_id)
          .order('period');
        timetable = tt ?? [];
      }

      if (record) {
        const { data: g } = await supabase
          .from('grades')
          .select('*')
          .eq('student_record_id', record.id);
        grades = g ?? [];
        const { data: a } = await supabase
          .from('attendance')
          .select('*')
          .eq('student_record_id', record.id)
          .order('date', { ascending: false });
        attendance = a ?? [];
        const subjIds = [...new Set(grades.map((gr) => gr.subject_id).filter(Boolean))];
        if (subjIds.length) {
          const { data: s } = await supabase.from('subjects').select('*').in('id', subjIds);
          subjects = s ?? [];
        }
      }

      let fees = [];
      let announcements = [];
      if (record) {
        const { data: f } = await supabase
          .from('fees')
          .select('*')
          .eq('student_record_id', record.id)
          .order('due_date');
        fees = f ?? [];
      }
      const { data: ann } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      announcements = ann ?? [];

      setData({ record, class: myClass, grades, subjects, attendance, timetable, fees, announcements });
    })();
  }, [profile?.id]);

  const subjectName = (id) => data.subjects.find((s) => s.id === id)?.name ?? '—';
  const avg = avgScore(data.grades);
  const avgLetter = letterFor(avg);
  const attPct = attendanceRate(data.attendance);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="My class" value={data.class?.name ?? (data.record ? 'Unassigned' : '—')} icon={<School size={20} />} tone="violet" delay={0} />
        <StatCard label="Average score" value={avg != null ? `${avg}%` : '—'} icon={<Trophy size={20} />} tone="blue" delay={80} />
        <StatCard label="Grade letter" value={avgLetter ?? '—'} icon={<BookMarked size={20} />} tone={avgLetter ? 'emerald' : 'amber'} delay={160} />
        <StatCard label="Attendance" value={attPct != null ? `${attPct}%` : '—'} icon={<CalendarDays size={20} />} tone="amber" delay={240} />
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

      {/* MARKER:STUD_ACADEMIC */}
      {data.grades.length > 0 && (
        <section className="card">
          <h3 className="card-title">My grades</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Term</th>
                <th>Score</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {data.grades.map((g) => (
                <tr key={`${g.subject_id}-${g.term}`}>
                  <td>{subjectName(g.subject_id)}</td>
                  <td>{g.term}</td>
                  <td>{g.score != null ? `${g.score}%` : '—'}</td>
                  <td>
                    {g.grade_letter ? (
                      <span
                        className="grade-pill"
                        style={{ color: LETTER_COLORS[g.grade_letter], borderColor: LETTER_COLORS[g.grade_letter] }}
                      >
                        {g.grade_letter}
                      </span>
                    ) : (
                      <span className="muted-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {data.attendance.length > 0 && (
        <section className="card">
          <h3 className="card-title">Attendance history (last days)</h3>
          <div className="attend-dots">
            {data.attendance.map((a) => (
              <span
                key={a.id}
                className={`dot ${a.status}`}
                title={`${a.date} — ${a.status}`}
              />
            ))}
          </div>
        </section>
      )}

      {data.timetable.length > 0 && (
        <section className="card">
          <h3 className="card-title">My timetable (this week)</h3>
          <ul className="tt-mini">
            {data.timetable.map((t) => (
              <li key={t.id}>
                <span className="tt-mini-day">{t.day}</span>
                <span className="tt-mini-subj">P{t.period} · {subjectName(t.subject_id)}</span>
                <time>{t.start_time ?? ''}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.fees.length > 0 && (
        <section className="card">
          <h3 className="card-title">My fees</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {data.fees.map((f) => {
                const balance = Math.max(0, Number(f.amount) - Number(f.paid_amount));
                const status = balance <= 0 ? 'paid' : Number(f.paid_amount) > 0 ? 'partial' : 'unpaid';
                return (
                  <tr key={f.id}>
                    <td>{f.description}</td>
                    <td>₵{money(f.amount)}</td>
                    <td>₵{money(f.paid_amount)}</td>
                    <td><strong>₵{money(balance)}</strong></td>
                    <td>
                      <span className={`badge ${status === 'paid' ? 'badge-approved' : status === 'partial' ? 'badge-pending' : 'badge-rejected'}`}>{status}</span>
                    </td>
                    <td>{f.due_date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {data.announcements.length > 0 && (
        <section className="card">
          <h3 className="card-title">School announcements</h3>
          <ul className="feed-mini">
            {data.announcements.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong>
                <p>{a.body}</p>
                <time>{a.author_name || 'EduSphere'} · {a.created_at?.slice(0, 10)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RoadmapCard compact />
    </div>
  );
}