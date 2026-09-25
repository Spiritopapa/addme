import { useEffect, useState } from 'react';
import { BookMarked, School, CalendarDays, Trophy } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { letterFor, LETTER_COLORS, avgScore, attendanceRate } from '../lib/grades.js';
import { supabase } from '../lib/supabase.js';

export default function StudentDashboard({ session }) {
  const { profile } = session;
  const [data, setData] = useState({
    record: null,
    class: null,
    grades: [],
    subjects: [],
    attendance: [],
    timetable: [],
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

      setData({ record, class: myClass, grades, subjects, attendance, timetable });
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

      <RoadmapCard compact />
    </div>
  );
}