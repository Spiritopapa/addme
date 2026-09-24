import { useEffect, useState } from 'react';
import { Search, Check, X, RefreshCw } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { supabase, supabaseConfigured } from '../lib/supabase.js';

const TABS = ['all', 'pending', 'approved', 'rejected'];
const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

export default function ApplicationsView() {
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    let req = supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    if (tab !== 'all') {
      req = req.eq('status', tab);
    }
    const { data, error } = await req;
    if (error) {
      setMessage({ type: 'error', text: `Could not load applications: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!supabaseConfigured) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const decide = async (id, status) => {
    setBusyId(id);
    setMessage(null);
    const { error } = await supabase
      .from('students')
      .update({ status })
      .eq('id', id);
    setBusyId(null);
    if (error) {
      setMessage({ type: 'error', text: `Decision failed: ${error.message}` });
      return;
    }
    setMessage({ type: 'success', text: `Application marked ${status}.` });
    void load();
  };

  const visible = query.trim()
    ? rows.filter(
        (r) =>
          (r.full_name ?? '').toLowerCase().includes(query.trim().toLowerCase()) ||
          (r.email ?? '').toLowerCase().includes(query.trim().toLowerCase()) ||
          (r.program ?? '').toLowerCase().includes(query.trim().toLowerCase()),
      )
    : rows;

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Admissions"
        title="Applications"
        sub="Review, approve or reject admission applications."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />

      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <div className="toolbar">
        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'all' ? 'All' : STATUS_LABELS[t]}
            </button>
          ))}
        </div>
        <label className="search-box" htmlFor="app-search">
          <Search size={15} />
          <input
            id="app-search"
            type="search"
            placeholder="Search name, email, program…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {/* ── table body ─────────────────────────────────────────── */}
      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : visible.length === 0 ? (
        <div className="card"><p className="card-note">No applications match this filter.</p></div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Email</th>
                <th>Program</th>
                <th>GPA</th>
                <th>Applied</th>
                <th>Status</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id} className={s.status === 'pending' ? 'row-attention' : ''}>
                  <td>
                    <span className="cell-avatar">{userInitials(s.full_name)}</span>
                    {s.full_name}
                  </td>
                  <td>{s.email}</td>
                  <td>{s.program}</td>
                  <td>{s.previous_gpa ?? '—'}</td>
                  <td>{formatDate(s.created_at)}</td>
                  <td>
                    <span className={`badge badge-${s.status}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="row-actions">
                    {s.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          className="icon-btn success"
                          title="Approve"
                          aria-label={`Approve ${s.full_name}`}
                          disabled={busyId === s.id}
                          onClick={() => void decide(s.id, 'approved')}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Reject"
                          aria-label={`Reject ${s.full_name}`}
                          disabled={busyId === s.id}
                          onClick={() => void decide(s.id, 'rejected')}
                        >
                          <X size={16} />
                        </button>
                      </>
                    ) : busyId === s.id ? (
                      <span className="spinner-xs" aria-label="Saving" />
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}