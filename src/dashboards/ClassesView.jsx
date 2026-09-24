import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, School } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { canManage } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';

const EMPTY = {
  name: '',
  code: '',
  description: '',
  academic_year: new Date().getFullYear() + '/' + (new Date().getFullYear() + 1),
  capacity: 30,
  class_teacher_id: '',
};

export default function ClassesView({ session }) {
  const editable = canManage(session.user);
  const [rows, setRows] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [enroll, setEnroll] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('name');
    if (error) {
      setMessage({ type: 'error', text: `Could not load classes: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  const loadTeachers = async () => {
    const { data } = await supabase
      .from('staff_records')
      .select('profile_id, full_name, position, department')
      .order('full_name');
    setTeachers(data ?? []);
  };

  useEffect(() => {
    void load();
    if (editable) void loadTeachers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEnrollments = async () => {
    if (rows.length === 0 || enroll.loaded) return;
    const { data } = await supabase.from('student_records').select('class_id');
    const counts = {};
    for (const r of data ?? []) counts[r.class_id] = (counts[r.class_id] ?? 0) + 1;
    setEnroll({ counts, loaded: true });
  };

  useEffect(() => {
    void loadEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  // ── form handlers ──────────────────────────────────────────────────────
  const openCreate = () => {
    setForm(EMPTY);
    setModal({ mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      name: item.name,
      code: item.code,
      description: item.description ?? '',
      academic_year: item.academic_year,
      capacity: item.capacity,
      class_teacher_id: item.class_teacher_id ?? '',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    const selectedTeacher = teachers.find((t) => t.profile_id === form.class_teacher_id);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description.trim() || null,
      academic_year: form.academic_year,
      capacity: Number(form.capacity),
      class_teacher_id: form.class_teacher_id || null,
      class_teacher_name: selectedTeacher?.full_name ?? null,
    };

    if (!payload.name || !payload.code) {
      setMessage({ type: 'error', text: 'Class name and code are required.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = modal.mode === 'create'
      ? await supabase.from('classes').insert(payload)
      : await supabase.from('classes').update(payload).eq('id', modal.item.id);
    setBusy(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: modal.mode === 'create' ? 'Class created.' : 'Class updated.' });
    void load();
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete class "${item.name}"? Students keep their records; the class assignment is cleared.`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('classes').delete().eq('id', item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Class deleted.' });
    void load();
  };

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 2 · Administration"
        title="Classes"
        sub="Academic classes, their class teacher and enrollment. Admins & developers manage; staff view."
        actions={
          <div className="page-actions">
            {editable && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <Plus size={15} /> New class
              </button>
            )}
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
          <p className="card-note">No classes yet. Admins can create the first class with “New class”.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Code</th>
                <th>Academic year</th>
                <th>Class teacher</th>
                <th>Students</th>
                <th>Capacity</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const count = enroll.counts?.[c.id] ?? 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="cell-avatar"><School size={14} /></span>
                      {c.name}
                    </td>
                    <td><code className="mono-chip">{c.code}</code></td>
                    <td>{c.academic_year}</td>
                    <td>{c.class_teacher_name ?? '—'}</td>
                    <td>{count}</td>
                    <td>{count}/{c.capacity}</td>
                    <td className="row-actions">
                      {editable ? (
                        <>
                          <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => openEdit(c)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => void remove(c)}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <span className="card-note muted-xs">view</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MARKER:MODAL */}
      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? 'New class' : 'Edit class'}
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : modal?.mode === 'create' ? 'Create class' : 'Save changes'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="field">
            <label htmlFor="cls-name">Class name</label>
            <input id="cls-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grade 7 A" required />
          </div>
          <div className="field">
            <label htmlFor="cls-code">Code (unique)</label>
            <input id="cls-code" type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. GR7A" required />
          </div>
          <div className="field">
            <label htmlFor="cls-year">Academic year</label>
            <input id="cls-year" type="text" value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="cls-capacity">Capacity</label>
            <input id="cls-capacity" type="number" min="1" max="200" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
          </div>
          <div className="field">
            <label htmlFor="cls-teacher">Class teacher (staff)</label>
            <select id="cls-teacher" value={form.class_teacher_id} onChange={(e) => setForm({ ...form, class_teacher_id: e.target.value })}>
              <option value="">No teacher assigned</option>
              {teachers.map((t) => (
                <option key={t.profile_id} value={t.profile_id}>
                  {t.full_name} — {t.position}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="cls-desc">Description</label>
            <textarea id="cls-desc" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional note…" />
          </div>
        </form>
      </Modal>
    </div>
  );
}