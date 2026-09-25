import { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Users,
  ScrollText,
  FileDown,
  Activity,
  RefreshCw,
  Save,
  CheckCircle,
  TriangleAlert,
} from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { Link } from 'react-router-dom';
import { formatDate, userInitials } from '../lib/auth.js';
import { ALL_ROLES, roleInfo } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';
import { downloadCsv } from '../lib/export.js';

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'users', label: 'Users & roles', icon: Users },
  { id: 'audit', label: 'Audit log', icon: ScrollText },
  { id: 'reports', label: 'Reports', icon: FileDown },
];

const ACTION_TONES = {
  role_change: 'amber',
  payment: 'emerald',
  announcement: 'blue',
  fee: 'violet',
  student: 'blue',
  class: 'violet',
  system: 'amber',
};

async function studentNameMap() {
  const { data } = await supabase.from('student_records').select('id, full_name, admission_no');
  const map = {};
  for (const s of data ?? []) map[s.id] = `${s.admission_no ?? ''} ${s.full_name}`.trim();
  return map;
}

async function exportStudents(setExporting) {
  setExporting('students');
  const { data } = await supabase.from('student_records').select('*');
  const { data: cls } = await supabase.from('classes').select('id, name');
  const cname = {};
  for (const c of cls ?? []) cname[c.id] = c.name;
  downloadCsv('students.csv', data ?? [], [
    { label: 'Admission No', get: (r) => r.admission_no },
    { label: 'Full Name', get: (r) => r.full_name },
    { label: 'Class', get: (r) => cname[r.class_id] ?? '' },
    { label: 'Email', get: (r) => r.email },
    { label: 'Guardian', get: (r) => r.guardian_name },
    { label: 'Status', get: (r) => r.status },
    { label: 'Enrolled', get: (r) => r.enrollment_date },
  ]);
  setExporting(null);
}

async function exportGrades(setExporting) {
  setExporting('gradebook');
  const { data } = await supabase.from('grades').select('*');
  const students = await studentNameMap();
  const { data: subjects } = await supabase.from('subjects').select('id, name');
  const sub = {};
  for (const s of subjects ?? []) sub[s.id] = s.name;
  downloadCsv('gradebook.csv', data ?? [], [
    { label: 'Student', get: (r) => students[r.student_record_id] ?? '' },
    { label: 'Subject', get: (r) => sub[r.subject_id] ?? '' },
    { label: 'Term', get: (r) => r.term },
    { label: 'Score', get: (r) => r.score },
    { label: 'Grade', get: (r) => r.grade_letter },
  ]);
  setExporting(null);
}

async function exportFees(setExporting) {
  setExporting('fees');
  const { data } = await supabase.from('fees').select('*');
  const students = await studentNameMap();
  downloadCsv('fees.csv', data ?? [], [
    { label: 'Student', get: (r) => students[r.student_record_id] ?? '' },
    { label: 'Description', get: (r) => r.description },
    { label: 'Amount', get: (r) => r.amount },
    { label: 'Paid', get: (r) => r.paid_amount },
    { label: 'Balance', get: (r) => Math.max(0, Number(r.amount) - Number(r.paid_amount)) },
    { label: 'Due', get: (r) => r.due_date },
  ]);
  setExporting(null);
}

async function exportAttendance(setExporting) {
  setExporting('attendance');
  const { data } = await supabase.from('attendance').select('*');
  const students = await studentNameMap();
  downloadCsv('attendance.csv', data ?? [], [
    { label: 'Student', get: (r) => students[r.student_record_id] ?? '' },
    { label: 'Date', get: (r) => r.date },
    { label: 'Status', get: (r) => r.status },
    { label: 'Notes', get: (r) => r.notes },
  ]);
  setExporting(null);
}

export default function DeveloperPortal({ session }) {
  const [tab, setTab] = useState('overview');
  const [profiles, setProfiles] = useState([]);
  const [audit, setAudit] = useState([]);
  const [counts, setCounts] = useState({});
  const [pingMs, setPingMs] = useState(null);
  const [busy, setBusy] = useState(new Set());
  const [message, setMessage] = useState(null);
  const [exporting, setExporting] = useState(null);

  const loadEverything = async (opts = {}) => {
    setMessage(null);
    const { data: p } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setProfiles(p ?? []);

    const { data: a } = opts.withAudit
      ? await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(80)
      : { data: null };
    setAudit(a ?? []);

    const tables = ['classes', 'staff_records', 'student_records', 'subjects', 'grades', 'attendance', 'timetable', 'fees', 'receipts', 'announcements'];
    const c = {};
    const pairs = await Promise.all(tables.map((t) => supabase.from(t).select('id', { count: 'exact', head: true })));
    tables.forEach((t, i) => { c[t] = pairs[i].count ?? 0; });
    setCounts(c);
  };

  useEffect(() => {
    void loadEverything({ withAudit: true });
    // ping
    const t0 = Date.now();
    void supabase.from('profiles').select('id', { count: 'exact', head: true }).then(() => setPingMs(Date.now() - t0));
  }, []);

  // ── role manager ────────────────────────────────────────────────────────
  const changeRole = async (profile, nextRole) => {
    if (nextRole === profile.role) return;
    setBusy((prev) => new Set(prev).add(profile.id));
    setMessage(null);
    const { error } = await supabase.rpc('admin_set_role', {
      p_user_id: profile.id,
      p_role: nextRole,
    });
    setBusy((prev) => {
      const next = new Set(prev);
      next.delete(profile.id);
      return next;
    });
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: `Role updated for ${profile.full_name || profile.email}.` });
    void loadEverything({ withAudit: true });
  };

  const refreshAudit = async () => {
    setMessage(null);
    const { data: a } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(80);
    setAudit(a ?? []);
  };

  // MARKER:DEVPL_PORTAL
  const actorNames = {};
  for (const p of profiles) actorNames[p.id] = p.full_name || p.email;

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 5 · Platform"
        title="Developer portal"
        sub="System health, role management and the audit trail — the command deck for the whole platform."
      />

      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <div className="portal-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`portal-tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={15} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <>
          <div className="stat-grid stat-grid-sm">
            <StatCard label="Database" value={pingMs != null ? `${pingMs} ms` : '…'} icon={<Activity size={18} />} tone="emerald" delay={0} />
            <StatCard label="Accounts" value={profiles.length} icon={<Users size={18} />} tone="violet" delay={80} />
            <StatCard label="Tables" value={Object.keys(counts).length} icon={<ShieldCheck size={18} />} tone="blue" delay={160} />
            <StatCard label="RLS state" value="On" icon={<CheckCircle size={18} />} tone="emerald" delay={240} />
          </div>

          <div className="card">
            <h3 className="card-title">Table inventory (row counts)</h3>
            <div className="table-tiles">
              {Object.entries(counts).map(([name, count]) => (
                <div key={name} className="table-tile">
                  <span className="table-tile-name">{name}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <p className="card-note">
              Every table enforces Row Level Security with role-scoped policies.
              Role changes and payments are written to the audit log automatically.
            </p>
          </div>

          <div className="card">
            <h3 className="card-title">Tech stack</h3>
            <div className="stack-chips">
              {['React 18', 'Vite 5', 'React Router 7', 'Supabase Auth', 'PostgreSQL RLS', 'Vercel'].map((s) => (
                <span key={s} className="stack-chip">{s}</span>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── USERS & ROLES ────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="card">
          <h3 className="card-title">Account governance</h3>
          <p className="card-note">
            Account creation, role assignment, activation/suspension and
            staff/student/parent registration codes for everyone except the
            developer live on the{' '}
            <Link to="/app/users-admin" className="inline-link">Users &amp; codes</Link>{' '}
            page. Role changes and deletions are written to the audit log.
          </p>
          <p className="card-note">
            As the owner you can add <strong>school admins</strong> directly
            (no code needed), and school admins create staff, student &amp;
            parent accounts. Developer accounts are bootstrap-created only and
            can never be modified or deleted.
          </p>
        </div>
      )}

      {/* MARKER:DEVPL_AUDIT */}
      {/* ── AUDIT LOG ───────────────────────────────────────────────── */}
      {tab === 'audit' && (
        <>
          <div className="portal-toolbar">
            <span className="card-note">
              {audit.length} most recent events · role changes & payments are
              recorded by the database automatically
            </span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void refreshAudit()}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
          {audit.length === 0 ? (
            <div className="card">
              <p className="card-note">No audit events yet — they appear as actions happen.</p>
            </div>
          ) : (
            <div className="card audit-list">
              {audit.map((row) => {
                const tone = ACTION_TONES[row.entity] ?? 'system';
                return (
                  <article key={row.id} className={`audit-row ${tone}`}>
                    <span className="audit-time">{formatDate(row.created_at, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="audit-action">{row.action.replace('_', ' ')}</span>
                    <span className="audit-meta">{actorNames[row.actor_id] || 'system'} → {row.entity}{row.entity_id ? ` · ${row.entity_id.slice(0, 8)}` : ''}</span>
                    {row.details && (
                      <pre className="audit-details">{JSON.stringify(row.details)}</pre>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── REPORTS ──────────────────────────────────────────────────── */}
      {tab === 'reports' && (
        <>
          <div className="card">
            <h3 className="card-title">Ad-hoc CSVs</h3>
            <p className="card-note">
              One-click exports generated in the browser from the current
              database state (developer-only visibility via RLS).
            </p>
            <div className="export-grid">
              <button
                type="button"
                className="btn btn-ghost export-btn"
                disabled={exporting !== null}
                onClick={() => void exportStudents(setExporting)}
              >
                <FileDown size={16} /> Students
              </button>
              <button
                type="button"
                className="btn btn-ghost export-btn"
                disabled={exporting !== null}
                onClick={() => void exportGrades(setExporting)}
              >
                <FileDown size={16} /> Gradebook
              </button>
              <button
                type="button"
                className="btn btn-ghost export-btn"
                disabled={exporting !== null}
                onClick={() => void exportFees(setExporting)}
              >
                <FileDown size={16} /> Fees
              </button>
              <button
                type="button"
                className="btn btn-ghost export-btn"
                disabled={exporting !== null}
                onClick={() => void exportAttendance(setExporting)}
              >
                <FileDown size={16} /> Attendance
              </button>
            </div>
            {exporting && (
              <p className="card-note" role="status">Exporting {exporting}…</p>
            )}
          </div>
          <div className="card">
            <h3 className="card-title">Security posture</h3>
            <ul className="roadmap">
              <li>
                <span className="roadmap-level">RLS</span>
                <div><strong>Every table role-scoped</strong><p>Policies enforce student/parent/staff/admin/developer visibility at the row level.</p></div>
              </li>
              <li>
                <span className="roadmap-level">RPC</span>
                <div><strong>SECURITY DEFINER functions</strong><p>admin_set_role, pay_fee and log_audit run with owner privileges and audit their own writes.</p></div>
              </li>
              <li>
                <span className="roadmap-level">Safe</span>
                <div><strong>No build-time secrets</strong><p>Only publishable anon keys reach the browser; service keys never ship.</p></div>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}