import { useEffect, useState } from 'react';
import { Users, ShieldCheck, CalendarClock } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { ALL_ROLES, roleInfo } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';

export default function UsersDirectory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, status, created_at')
        .order('created_at', { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setRows(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  const countByRole = (role) => rows.filter((r) => r.role === role).length;

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Developer"
        title="User directory"
        sub="Every account in the system — read-only in Level 1."
      />

      <div className="stat-grid stat-grid-sm">
        <StatCard label="Total accounts" value={rows.length} icon={<Users size={18} />} tone="violet" delay={0} />
        <StatCard label="School admins" value={countByRole('school_admin')} icon={<ShieldCheck size={18} />} tone="blue" delay={80} />
        <StatCard label="Students" value={countByRole('student')} icon={<CalendarClock size={18} />} tone="emerald" delay={160} />
        <StatCard label="Roles managed" value={ALL_ROLES.length} icon={<Users size={18} />} tone="amber" delay={240} />
      </div>

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : error ? (
        <div className="banner banner-error" role="alert">Could not load users: {error}</div>
      ) : rows.length === 0 ? (
        <div className="card"><p className="card-note">No accounts yet.</p></div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const meta = roleInfo(u.role);
                return (
                  <tr key={u.id}>
                    <td>
                      <span className="cell-avatar" style={{ background: meta.soft, color: meta.color }}>
                        {userInitials(u.full_name)}
                      </span>
                      {u.full_name ?? '—'}
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="role-chip" style={{ background: meta.soft, color: meta.color }}>
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${u.status === 'active' ? 'approved' : 'pending'}`}>
                        {u.status ?? '—'}
                      </span>
                    </td>
                    <td>{formatDate(u.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}