import { useEffect, useState } from 'react';
import { RefreshCw, Trash2, KeyRound, Copy, ShieldCheck } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { ROLE_ADMIN, ROLE_DEVELOPER, roleInfo, assignableRoles } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';

export default function UserAdminView({ session }) {
  const { user } = session;
  const role = user?.profile?.role ?? session.profile?.role;
  const isDev = role === ROLE_DEVELOPER;
  const allowedTargets = assignableRoles({ role });

  const [profiles, setProfiles] = useState([]);
  const [codes, setCodes] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(new Set());
  const [message, setMessage] = useState(null);
  const [genForm, setGenForm] = useState({ role: allowedTargets[0] ?? 'staff', student_record_id: '' });
  const [lastCode, setLastCode] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);

    const { data: all } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, status, created_at')
      .order('created_at', { ascending: false })
      .limit(300);

    // admins manage staff/students/parents only; developers manage everyone
    // except themselves and other developers
    const visible = (all ?? []).filter(
      (p) => p.role !== ROLE_DEVELOPER && (isDev || p.role !== ROLE_ADMIN),
    );
    setProfiles(visible);

    const { data: myCodes } = await supabase
      .from('registration_codes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setCodes(myCodes ?? []);

    const { data: roster } = await supabase
      .from('student_records')
      .select('id, full_name, admission_no')
      .order('full_name');
    setStudents(roster ?? []);

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentName = (id) => students.find((s) => s.id === id)?.full_name ?? '—';

  const changeRole = async (profile, nextRole) => {
    if (nextRole === profile.role) return;
    setBusy((prev) => new Set(prev).add(profile.id));
    setMessage(null);
    const { error } = await supabase.rpc('admin_set_role', { p_user_id: profile.id, p_role: nextRole });
    setBusy((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
    if (error) { setMessage({ type: 'error', text: error.message }); return; }
    setMessage({ type: 'success', text: 'Role updated.' });
    void load();
  };

  const toggleStatus = async (profile) => {
    const next = profile.status === 'active' ? 'suspended' : 'active';
    setBusy((prev) => new Set(prev).add(profile.id));
    setMessage(null);
    const { error } = await supabase.rpc('set_account_status', { p_user_id: profile.id, p_status: next });
    setBusy((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
    if (error) { setMessage({ type: 'error', text: error.message }); return; }
    setMessage({ type: 'success', text: `Account ${next === 'active' ? 'activated' : 'suspended'}.` });
    void load();
  };

  const remove = async (profile) => {
    if (!window.confirm(`Delete the account for ${profile.full_name || profile.email}? This permanently removes their login and unlinks their data.`)) return;
    setBusy((prev) => new Set(prev).add(profile.id));
    setMessage(null);
    const { error } = await supabase.rpc('delete_account', { p_user_id: profile.id });
    setBusy((prev) => { const n = new Set(prev); n.delete(profile.id); return n; });
    if (error) { setMessage({ type: 'error', text: error.message }); return; }
    setMessage({ type: 'success', text: 'Account deleted.' });
    void load();
  };

  // MARKER:UAV_RENDER
  const generate = async () => {
    setMessage(null);
    const { data: code, error } = await supabase.rpc('create_registration_code', {
      p_role: genForm.role,
      p_student_record_id: genForm.student_record_id || null,
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setLastCode(code);
    setMessage({ type: 'success', text: 'Registration code issued (valid 30 days).' });
    void load();
  };

  const revoke = async (code) => {
    if (!window.confirm(`Revoke code ${code.toUpperCase()}? New sign-ups will be rejected.`)) return;
    setMessage(null);
    const { error } = await supabase.rpc('revoke_registration_code', { p_code: code });
    if (error) { setMessage({ type: 'error', text: error.message }); return; }
    setMessage({ type: 'success', text: 'Code revoked.' });
    void load();
  };

  const copyCode = (code) => {
    void navigator.clipboard?.writeText?.(code.toUpperCase());
    setMessage({ type: 'success', text: `${code.toUpperCase()} copied.` });
  };

  const codeState = (c) => {
    if (c.used_by) return 'used';
    if (c.expires_at && c.expires_at < new Date().toISOString()) return 'expired';
    return 'available';
  };

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 6 · Governance"
        title="Users & registration codes"
        sub="Assign roles, activate or suspend accounts, and issue one-time registration codes. The developer (owner) is never listed or editable here."
        actions={(
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        )}
      />

      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      {/* ── Accounts ─────────────────────────────────────────────────── */}
      <section className="card">
        <h3 className="card-title">Accounts ({profiles.length})</h3>
        {loading ? (
          <div className="skeleton-table" aria-hidden="true" />
        ) : profiles.length === 0 ? (
          <p className="card-note">No manageable accounts found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const meta = roleInfo(p.role);
                  return (
                    <tr key={p.id}>
                      <td>
                        <span className="cell-avatar" style={{ background: meta.soft, color: meta.color }}>
                          {userInitials(p.full_name)}
                        </span>
                        {p.full_name || '—'}
                      </td>
                      <td>{p.email}</td>
                      <td className="role-cell">
                        <select
                          className="filter-select"
                          aria-label={`Role for ${p.full_name || p.email}`}
                          defaultValue={p.role}
                          disabled={busy.has(p.id)}
                          onChange={(e) => void changeRole(p, e.target.value)}
                        >
                          {allowedTargets.map((r) => (
                            <option key={r} value={r}>{roleInfo(r).label}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`badge ${p.status === 'active' ? 'badge-approved' : 'badge-rejected'}`}>
                          {p.status}
                        </span>
                      </td>
                      <td>{formatDate(p.created_at)}</td>
                      <td className="row-actions">
                        {busy.has(p.id) ? (
                          <span className="spinner-xs" aria-label="Saving" />
                        ) : (
                          <>
                            <button
                              type="button"
                              className={`icon-btn ${p.status === 'active' ? 'danger' : 'success'}`}
                              title={p.status === 'active' ? 'Suspend account' : 'Reactivate account'}
                              onClick={() => void toggleStatus(p)}
                            >
                              {p.status === 'active' ? <ShieldCheck size={15} /> : <KeyRound size={15} />}
                            </button>
                            <button type="button" className="icon-btn danger" title="Delete account" onClick={() => void remove(p)}>
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MARKER:UAV_CODES */}
      <section className="card">
        <h3 className="card-title">Issue a registration code</h3>
        <p className="card-note">
          Share this code with the person joining; they enter it when creating
          their account. Codes are single-use and valid for 30 days.
          {isDev ? 'As the developer you may also issue school admin codes.' : 'As a school admin you can issue staff, student or parent codes.'}
        </p>
        <div className="code-issue">
          <select
            className="filter-select"
            aria-label="Role for the code"
            value={genForm.role}
            onChange={(e) => setGenForm({ ...genForm, role: e.target.value })}
          >
            {allowedTargets.map((r) => (
              <option key={r} value={r}>{roleInfo(r).label}</option>
            ))}
          </select>
          {(genForm.role === 'student' || genForm.role === 'parent') && (
            <select
              className="filter-select"
              aria-label="Bind to student record (optional)"
              value={genForm.student_record_id}
              onChange={(e) => setGenForm({ ...genForm, student_record_id: e.target.value })}
            >
              <option value="">{genForm.role === 'parent' ? 'No child bound (link later)' : 'No record bound (skip auto-link)'}</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} · {s.admission_no}</option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-primary" onClick={() => void generate()}>
            <KeyRound size={15} /> Generate code
          </button>
        </div>
        {lastCode && (
          <div className="banner banner-success code-result" role="status">
            <span>Give them: <strong className="code-chip">{lastCode.toUpperCase()}</strong></span>
            <button type="button" className="icon-btn" title="Copy" aria-label="Copy code" onClick={() => copyCode(lastCode)}>
              <Copy size={16} />
            </button>
          </div>
        )}
      </section>

      <section className="card">
        <h3 className="card-title">Codes issued ({codes.length})</h3>
        {codes.length === 0 ? (
          <p className="card-note">No codes yet. Generate the first one above.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Role</th>
                  <th>Bound to</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const state = codeState(c);
                  return (
                    <tr key={c.id}>
                      <td><code className="mono-chip">{c.code.toUpperCase()}</code></td>
                      <td>{roleInfo(c.role).label}</td>
                      <td>{c.student_record_id ? studentName(c.student_record_id) : '—'}</td>
                      <td>
                        <span className={`badge ${state === 'available' ? 'badge-approved' : state === 'used' ? 'badge-pending' : 'badge-rejected'}`}>
                          {state}
                        </span>
                      </td>
                      <td>{formatDate(c.created_at)}</td>
                      <td className="row-actions">
                        <button type="button" className="icon-btn" title="Copy" aria-label={`Copy ${c.code.toUpperCase()}`} onClick={() => copyCode(c.code)}>
                          <Copy size={15} />
                        </button>
                        {state === 'available' && (
                          <button type="button" className="icon-btn danger" title="Revoke" aria-label={`Revoke ${c.code.toUpperCase()}`} onClick={() => void revoke(c.code)}>
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}