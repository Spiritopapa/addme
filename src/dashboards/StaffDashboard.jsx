import { useEffect, useState } from 'react';
import { ClipboardList, BookOpen, CalendarDays, Users } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';
import { supabase } from '../lib/supabase.js';

export default function StaffDashboard({ session }) {
  const [pending, setPending] = useState(null);

  useEffect(() => {
    void (async () => {
      const { count } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');
      setPending(count ?? 0);
    })();
  }, []);

  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Pending applications" value={pending ?? '…'} icon={<ClipboardList size={20} />} tone="amber" delay={0} />
        <StatCard label="My classes" value="L2" icon={<BookOpen size={20} />} tone="blue" delay={80} />
        <StatCard label="Today’s lessons" value="L3" icon={<CalendarDays size={20} />} tone="violet" delay={160} />
        <StatCard label="Students" value="L2" icon={<Users size={20} />} tone="emerald" delay={240} />
      </div>

      <section className="card">
        <h3 className="card-title">Teaching space (Level 2)</h3>
        <p className="card-note">
          Your class list, student rosters and subject assignments appear here in
          Level 2. Grades & attendance marking follow in Level 3.
        </p>
        <div className="skeleton-row" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <RoadmapCard />
    </div>
  );
}