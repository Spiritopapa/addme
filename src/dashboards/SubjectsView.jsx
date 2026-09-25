import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, BookOpen } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { supabase } from '../lib/supabase.js';

const EMPTY = { name: '', code: '', class_id: '', teacher_profile_id: '' };

export default function SubjectsView() {
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.from('subjects').select('*').order('name');
    if (error) {
      setMessage({ type: 'error', text: `Could not load subjects: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    void (async () => {
      const { data: cls } = await supabase.from('classes').select('id, name').order('name');
      setClasses(cls ?? []);
      const { data: stf } = await supabase
        .from('staff_records')
        .select('profile_id, full_name, position')
        .order('full_name');
      setStaff(stf ?? []);
    })();
  }, []);

  const className = (id) => classes.find((c) => c.id === id)?.name ?? '—';
  const teacherName = (id) => staff.find((s) => s.profile_id === id)?.full_name ?? '—';

  const openCreate = () => {
    setForm(EMPTY);
    setModal({ mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      code: item.code,
      class_id: item.class_id ?? '',
      teacher_profile_id: item.teacher_profile_id ?? '',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      setMessage({ type: 'error', text: 'Subject name and code are required.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      class_id: form.class_id || null,
      teacher_profile_id: form.teacher_profile_id || null,
    };
    const { error } = modal.mode === 'create'
      ? await supabase.from('subjects').insert(payload)
      : await supabase.from('subjects').update(payload).eq('id', modal.item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: 'Subject saved.' });
    void load();
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete subject "${item.name}"?`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('subjects').delete().eq('id', item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Subject deleted.' });
    void load();
  };

  // MARKER:SUBJTABLE
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 3 · Academics"
        title="Subjects"
        sub="The subjects taught per class. Teachers pick from these when marking grades."
        actions={
          <div className="page-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={15} /> New subject
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
          <p className="card-note">No subjects yet. Create the first one with “New subject”.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>Class</th>
                <th>Teacher</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="cell-avatar"><BookOpen size={14} /></span>
                    {s.name}
                  </td>
                  <td><code className="mono-chip">{s.code}</code></td>
                  <td>{className(s.class_id)}</td>
                  <td>{teacherName(s.teacher_profile_id)}</td>
                  <td className="row-actions">
                    <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${s.name}`} onClick={() => openEdit(s)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${s.name}`} onClick={() => void remove(s)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MARKER:SUBJMODAL */}
      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? 'New subject' : 'Edit subject'}
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : modal?.mode === 'create' ? 'Create subject' : 'Save changes'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="sub-name">Subject name</label>
              <input id="sub-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" required />
            </div>
            <div className="field">
              <label htmlFor="sub-code">Code</label>
              <input id="sub-code" type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" required />
            </div>
          </div>
          <div className="field">
            <label htmlFor="sub-class">Class</label>
            <select id="sub-class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
              <option value="">All / general</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="sub-teacher">Teacher (staff)</label>
            <select id="sub-teacher" value={form.teacher_profile_id} onChange={(e) => setForm({ ...form, teacher_profile_id: e.target.value })}>
              <option value="">No teacher assigned</option>
              {staff.map((s) => (
                <option key={s.profile_id} value={s.profile_id}>
                  {s.full_name} — {s.position}
                </option>
              ))}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}