import { useEffect, useState } from 'react';
import { ClipboardList, BookOpen, CalendarDays, Users } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { supabase } from '../lib/supabase.js';

export default function StaffDashboard({ session }) {
  const { profile } = session;
  const [data, setData] = useState({ pending: null, classes: [], studentsByClass: {} });

  useEffect(() => {
    void (async () => {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // RLS: a staff member only ever sees their own classes & their rosters.
      const { data: myClasses } = await supabase
        .from('classes')
        .select('*')
        .eq('class_teacher_id', profile?.id)
        .order('name');
      const { data: students } = await supabase
        .from('student_records')
        .select('id, full_name, class_id');
      const byClass = {};
      for (const s of students ?? []) {
        byClass[s.class_id] = (byClass[s.class_id] ?? 0) + 1;
      }

      setData({ pending: count ?? 0, classes: myClasses ?? [], studentsByClass: byClass });
    })();
  }, [profile?.id]);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="My classes" value={data.classes.length} icon={<BookOpen size={20} />} tone="blue" delay={0} />
        <StatCard
          label="My students"
          value={Object.values(data.studentsByClass).reduce((a, b) => a + b, 0)}
          icon={<Users size={20} />}
          tone="violet"
          delay={80}
        />
        <StatCard label="Pending applications" value={data.pending ?? '…'} icon={<ClipboardList size={20} />} tone="amber" delay={160} />
        <StatCard label="Today’s lessons" value="L3" icon={<CalendarDays size={20} />} tone="emerald" delay={240} />
      </div>

      {data.classes.length === 0 ? (
        <section className="card">
          <h3 className="card-title">My classes</h3>
          <p className="card-note">
            You are not assigned as a class teacher yet. An admin can assign you
            on the <strong>Classes</strong> page — then your rosters appear here.
          </p>
        </section>
      ) : (
        <section className="card">
          <h3 className="card-title">My class rosters (RLS scoped)</h3>
          <div className="mini-class-grid">
            {data.classes.map((c) => (
              <article key={c.id} className="mini-class">
                <header>
                  <strong>{c.name}</strong>
                  <span>{c.code}</span>
                </header>
                <p>
                  {c.academic_year} ·{' '}
                  <strong>{data.studentsByClass[c.id] ?? 0}</strong> students
                </p>
                {c.class_teacher_name && <p className="card-note">Teacher: {c.class_teacher_name}</p>}
              </article>
            ))}
          </div>
        </section>
      )}

      <RoadmapCard compact />
    </div>
  );
}