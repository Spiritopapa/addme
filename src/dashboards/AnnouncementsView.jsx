import { useEffect, useState } from 'react';
import { Plus, Trash2, RefreshCw, Megaphone, Pin } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

const AUDIENCES = ['all', 'staff', 'class'];
const AUDIENCE_LABELS = { all: 'Everyone', staff: 'Staff only', class: 'Class' };

export default function AnnouncementsView({ session }) {
  const { profile } = session;
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ title: '', body: '', audience: 'all', class_id: '', pinned: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      setMessage({ type: 'error', text: `Could not load announcements: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void (async () => {
      const { data } = await supabase.from('classes').select('id, name').order('name');
      setClasses(data ?? []);
    })();
  }, []);

  const className = (id) => classes.find((c) => c.id === id)?.name ?? '—';

  const openCreate = () => {
    setForm({ title: '', body: '', audience: 'all', class_id: '', pinned: false });
    setModal({ mode: 'create' });
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setMessage({ type: 'error', text: 'Title and message are required.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('announcements').insert({
      title: form.title.trim(),
      body: form.body.trim(),
      audience: form.audience,
      class_id: form.audience === 'class' ? form.class_id || null : null,
      pinned: form.pinned,
      author_id: profile?.id,
      author_name: profile?.full_name,
    });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: 'Announcement published.' });
    void load();
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('announcements').delete().eq('id', item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Announcement deleted.' });
    void load();
  };

  // MARKER:ANNRENDER
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 4 · Communication"
        title="Announcements"
        sub="Broadcast to everyone, staff only, or a single class. RLS decides who can read each post."
        actions={
          <div className="page-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={15} /> New announcement
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        }
      />

      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : rows.length === 0 ? (
        <div className="card">
          <p className="card-note">No announcements yet. Publish the first one with “New announcement”.</p>
        </div>
      ) : (
        <div className="feed">
          {rows.map((a) => (
            <article key={a.id} className={`announcement ${a.pinned ? 'pinned' : ''}`}>
              <header>
                <span className="cell-avatar">{userInitials(a.author_name)}</span>
                <div className="ann-meta">
                  <h3>
                    {a.pinned && <Pin size={14} aria-label="Pinned" />}
                    {a.title}
                  </h3>
                  <p>
                    {a.author_name || 'EduSphere'} · {formatDate(a.created_at)} ·{' '}
                    <span className={`badge ${a.audience === 'staff' ? 'badge-pending' : a.audience === 'class' ? 'badge-rejected' : 'badge-approved'}`}>
                      {AUDIENCE_LABELS[a.audience]}{a.audience === 'class' ? ` — ${className(a.class_id)}` : ''}
                    </span>
                  </p>
                </div>
                <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${a.title}`} onClick={() => void remove(a)}>
                  <Trash2 size={15} />
                </button>
              </header>
              <p className="ann-body">{a.body}</p>
            </article>
          ))}
        </div>
      )}

      {/* MARKER:ANNMODAL */}
      <Modal
        open={!!modal}
        title="New announcement"
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Publishing…' : 'Publish'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="field">
            <label htmlFor="ann-title">Title</label>
            <input id="ann-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mid-term exams next week" required />
          </div>
          <div className="field">
            <label htmlFor="ann-body">Message</label>
            <textarea id="ann-body" rows="4" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Details everyone needs to know…" required />
          </div>
          <div className="field">
            <label htmlFor="ann-aud">Audience</label>
            <select id="ann-aud" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {AUDIENCES.map((a) => (
                <option key={a} value={a}>{AUDIENCE_LABELS[a]}</option>
              ))}
            </select>
          </div>
          {form.audience === 'class' && (
            <div className="field">
              <label htmlFor="ann-class">Class</label>
              <select id="ann-class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} required>
                <option value="">Choose a class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <label className="check-row">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
            <span><Pin size={14} /> Pin to the top of the feed</span>
          </label>
        </form>
      </Modal>
    </div>
  );
}