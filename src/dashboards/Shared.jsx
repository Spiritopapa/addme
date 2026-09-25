import { Rocket } from 'lucide-react';
import { firstName } from '../lib/auth.js';
import { roleInfo } from '../lib/roles.js';

export function WelcomeBanner({ session }) {
  const { profile } = session;
  const meta = roleInfo(profile?.role);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fullName = profile?.full_name ?? 'there';

  return (
    <div
      className="welcome-banner"
      style={{ '--pfx': meta.color, '--pfs': meta.soft }}
    >
      <div>
        <h1>
          {greeting}, {firstName(fullName)} <span className="welcome-wave">👋</span>
        </h1>
        <p>
          This is your <strong>{meta.label.toLowerCase()}</strong> portal. Everything here
          is scoped by Row Level Security — you only ever see what you should.
        </p>
      </div>
      <span className="welcome-chip">
        <Rocket size={16} /> Level 3 · live
      </span>
    </div>
  );
}

const ROADMAP = [
  { level: 'Level 4', title: 'Fees, payments & announcements', text: 'Invoices, receipts, and school-wide broadcasts.' },
  { level: 'Level 5', title: 'Developer portal & polish', text: 'Audit log, user management and system health.' },
];

export function RoadmapCard({ compact = false }) {
  const items = compact ? ROADMAP.slice(0, 3) : ROADMAP;
  return (
    <section className="card roadmap-card">
      <h3 className="card-title">What’s next on the roadmap</h3>
      <ul className="roadmap">
        {items.map((r) => (
          <li key={r.level}>
            <span className="roadmap-level">{r.level}</span>
            <div>
              <strong>{r.title}</strong>
              <p>{r.text}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}