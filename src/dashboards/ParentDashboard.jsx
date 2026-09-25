import { useEffect, useState } from 'react';
import { Users, HeartHandshake, GraduationCap, WalletCards, School } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { letterFor, avgScore, attendanceRate } from '../lib/grades.js';
import { supabase } from '../lib/supabase.js';

export default function ParentDashboard({ session }) {
  const { profile } = session;
  const [children, setChildren] = useState(null);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    if (!profile?.id) return;
    void (async () => {
      const { data: links } = await supabase
        .from('guardian_links')
        .select('student_record_id, relation')
        .eq('guardian_profile_id', profile.id);

      const ids = (links ?? []).map((l) => l.student_record_id);
      let records = [];
      let classes = [];
      let gradesById = {};
      let attendanceById = {};
      let feesByChild = {};

      if (ids.length > 0) {
        const { data } = await supabase.from('student_records').select('*').in('id', ids);
        records = data ?? [];
        const classIds = records.map((r) => r.class_id).filter(Boolean);
        if (classIds.length > 0) {
          const { data: cls } = await supabase.from('classes').select('id, name').in('id', classIds);
          classes = cls ?? [];
        }
        const { data: grades } = await supabase.from('grades').select('student_record_id, score').in('student_record_id', ids);
        for (const g of grades ?? []) {
          (gradesById[g.student_record_id] ??= []).push(g);
        }
        const { data: attendance } = await supabase.from('attendance').select('student_record_id, status').in('student_record_id', ids);
        for (const a of attendance ?? []) {
          (attendanceById[a.student_record_id] ??= []).push(a);
        }
        const { data: fees } = await supabase.from('fees').select('student_record_id, amount, paid_amount').in('student_record_id', ids);
        for (const f of fees ?? []) {
          (feesByChild[f.student_record_id] ??= []).push(f);
        }
      }
      const className = (id) => classes.find((c) => c.id === id)?.name ?? '—';
      setChildren(records.map((r) => ({
        ...r,
        class_name: className(r.class_id),
        relation: links?.find((l) => l.student_record_id === r.id)?.relation ?? 'Guardian',
        avg: avgScore(gradesById[r.id] ?? []),
        letter: letterFor(avgScore(gradesById[r.id] ?? [])),
        attPct: attendanceRate(attendanceById[r.id] ?? []),
        fees: feesByChild[r.id] ?? [],
      })));
      const { data: ann } = await supabase
        .from('announcements')
        .select('*')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(6);
      setAnnouncements(ann ?? []);
    })();
  }, [profile?.id]);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Children linked" value={children ? children.length : '…'} icon={<Users size={20} />} tone="amber" delay={0} />
        <StatCard label="My child’s GPA" value="L3" icon={<GraduationCap size={20} />} tone="violet" delay={80} />
        <StatCard label="Attendance" value="L3" icon={<HeartHandshake size={20} />} tone="blue" delay={160} />
        <StatCard label="Fees due" value="L4" icon={<WalletCards size={20} />} tone="emerald" delay={240} />
      </div>

      {children === null ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : children.length === 0 ? (
        <section className="card">
          <h3 className="card-title">Your family centre</h3>
          <p className="card-note">
            No children are linked to your account yet. When a school admin links
            your child to you, their class & progress appear here — RLS keeps
            other pupils invisible.
          </p>
        </section>
      ) : (
        <section className="card">
          <h3 className="card-title">My children</h3>
          <div className="mini-class-grid">
            {children.map((c) => (
              <article key={c.id} className="mini-class">
                <header>
                  <span className="cell-avatar"><School size={14} /></span>
                  <strong>{c.full_name}</strong>
                  <span>{c.admission_no}</span>
                </header>
                <p>Class: <strong>{c.class_name}</strong></p>
                <p className="card-note">
                  {c.relation}
                  {c.avg != null ? ` · Avg ${c.avg}% (${c.letter})` : ' · No grades yet'}
                  {c.attPct != null ? ` · Attendance ${c.attPct}%` : ''}
                </p>
                {(() => {
                  const balance = c.fees.reduce((acc, f) => acc + (Number(f.amount) - Number(f.paid_amount)), 0);
                  return balance > 0 ? (
                    <p className="ann-body fee-note">Fees outstanding: <strong>₵{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></p>
                  ) : null;
                })()}
              </article>
            ))}
          </div>
        </section>
      )}

      {announcements.length > 0 && (
        <section className="card">
          <h3 className="card-title">School announcements</h3>
          <ul className="feed-mini">
            {announcements.map((a) => (
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