import { HeartHandshake, Users, WalletCards, GraduationCap } from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import { WelcomeBanner, RoadmapCard } from './Shared.jsx';

export default function ParentDashboard({ session }) {
  return (
    <div className="dashboard">
      <WelcomeBanner session={session} />

      <div className="stat-grid">
        <StatCard label="Children linked" value="L2" icon={<Users size={20} />} tone="amber" delay={0} />
        <StatCard label="My child’s GPA" value="L3" icon={<GraduationCap size={20} />} tone="violet" delay={80} />
        <StatCard label="Attendance" value="L3" icon={<HeartHandshake size={20} />} tone="blue" delay={160} />
        <StatCard label="Fees due" value="L4" icon={<WalletCards size={20} />} tone="emerald" delay={240} />
      </div>

      <section className="card">
        <h3 className="card-title">Your family centre (Level 2)</h3>
        <p className="card-note">
          When your child’s account is linked to you, this portal becomes their
          progress dashboard — grades, attendance, fees and school news in one
          place.
        </p>
        <div className="skeleton-row" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>

      <RoadmapCard compact />
    </div>
  );
}