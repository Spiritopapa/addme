import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, UserRound } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { formatDate, userInitials } from '../lib/auth.js';
import { canManage } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';

const STATUSES = ['active', 'graduated', 'withdrawn'];
const STATUS_LABELS = { active: 'Active', graduated: 'Graduated', withdrawn: 'Withdrawn' };

const EMPTY = {
  full_name: '',
  email: '',
  admission_no: '',
  class_id: '',
  date_of_birth: '',
  gender: '',
  guardian_name: '',
  guardian_phone: '',
  address: '',
  profile_id: '',
  guardian_profile_id: '',
};

export default function StudentsView({ session }) {
  const editable = canManage(session.user);
  const [rows, setRows] = useState([]);
  const [classes, setClasses] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setMessage(null);
    let req = supabase.from('student_records').select('*').order('admission_no');
    if (classFilter !== 'all') req = req.eq('class_id', classFilter);
    const { data, error } = await req;
    if (error) {
      setMessage({ type: 'error', text: `Could not load students: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classFilter]);

  useEffect(() => {
    void (async () => {
      const { data: cls } = await supabase.from('classes').select('id, name');
      setClasses(cls ?? []);
    })();
    if (editable) {
      void (async () => {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, email, role')
          .order('full_name');
        const linked = await supabase.from('student_records').select('profile_id');
        const linkedIds = new Set((linked.data ?? []).map((r) => r.profile_id).filter(Boolean));
        setProfiles((profs ?? []).filter((p) => !linkedIds.has(p.id)));
        setParents((profs ?? []).filter((p) => p.role === 'parent'));
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const className = (id) => classes.find((c) => c.id === id)?.name ?? '—';

  // MARKER:STUDHANDLERS
  const openCreate = () => {
    setForm({
      ...EMPTY,
      admission_no: `STD-${String(rows.length + 1).padStart(4, '0')}`,
    });
    setModal({ mode: 'create', item: null });
  };

  const openEdit = (item) => {
    setForm({
      full_name: item.full_name,
      email: item.email ?? '',
      admission_no: item.admission_no,
      class_id: item.class_id ?? '',
      date_of_birth: item.date_of_birth ?? '',
      gender: item.gender ?? '',
      guardian_name: item.guardian_name ?? '',
      guardian_phone: item.guardian_phone ?? '',
      address: item.address ?? '',
      profile_id: item.profile_id ?? '',
      guardian_profile_id: '',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    if (!form.full_name.trim() || !form.admission_no.trim()) {
      setMessage({ type: 'error', text: 'Full name and admission number are required.' });
      return;
    }

    setBusy(true);
    setMessage(null);

    // provision role for the linked student account
    if (editable && modal.mode === 'create' && form.profile_id) {
      const { error: roleError } = await supabase.rpc('admin_set_role', {
        p_user_id: form.profile_id,
        p_role: 'student',
      });
      if (roleError) {
        setBusy(false);
        setMessage({ type: 'error', text: `Role provisioning failed: ${roleError.message}` });
        return;
      }
    }

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim().toLowerCase() || null,
      admission_no: form.admission_no.trim().toUpperCase(),
      class_id: form.class_id || null,
      date_of_birth: form.date_of_birth || null,
      gender: form.gender || null,
      guardian_name: form.guardian_name.trim() || null,
      guardian_phone: form.guardian_phone.trim() || null,
      address: form.address.trim() || null,
    };

    if (modal.mode === 'create') {
      if (form.profile_id) {
        const { data: chosen } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', form.profile_id)
          .maybeSingle();
        payload.profile_id = form.profile_id;
        if (!payload.full_name) payload.full_name = chosen?.full_name;
        payload.email = payload.email ?? chosen?.email;
      }
      const { data: inserted, error } = await supabase
        .from('student_records')
        .insert(payload)
        .select()
        .single();
      if (error) {
        setBusy(false);
        setMessage({ type: 'error', text: error.message });
        return;
      }
      // link a guardian (parent profile) if provided
      if (form.guardian_profile_id && inserted?.id) {
        const { error: linkError } = await supabase
          .from('guardian_links')
          .insert({ guardian_profile_id: form.guardian_profile_id, student_record_id: inserted.id });
        if (linkError) {
          setBusy(false);
          setMessage({ type: 'error', text: `Student saved, but guardian link failed: ${linkError.message}` });
          return;
        }
      }
    } else {
      const { error } = await supabase
        .from('student_records')
        .update(payload)
        .eq('id', modal.item.id);
      if (error) {
        setBusy(false);
        setMessage({ type: 'error', text: error.message });
        return;
      }
    }

    setBusy(false);
    setModal(null);
    setMessage({ type: 'success', text: 'Student record saved.' });
    void load();
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete the student record for ${item.full_name}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('student_records').delete().eq('id', item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Student record deleted.' });
    void load();
  };

  const visible = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      return (r.full_name ?? '').toLowerCase().includes(q)
        || (r.admission_no ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  // MARKER:STUDTABLE
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 2 · Students"
        title="Student roster"
        sub="Enrolled students, their classes and guardians. Staff see only their own class rosters (RLS)."
        actions={
          <div className="page-actions">
            {editable && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
                <Plus size={15} /> Enroll student
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

      <div className="toolbar">
        <div className="filters">
          <select
            className="filter-select"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select
            className="filter-select"
            aria-label="Filter by class"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="all">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <label className="search-box" htmlFor="stud-search">
          <input
            id="stud-search"
            type="search"
            placeholder="Search name or admission no…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <p className="card-note">No student records match. Admins can enroll the first student with “Enroll student”.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no</th>
                <th>Class</th>
                <th>Guardian</th>
                <th>Enrolled</th>
                <th>Status</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="cell-avatar">{userInitials(s.full_name)}</span>
                    {s.full_name}
                  </td>
                  <td><code className="mono-chip">{s.admission_no}</code></td>
                  <td>{className(s.class_id)}</td>
                  <td>{s.guardian_name ?? '—'}</td>
                  <td>{formatDate(s.enrollment_date)}</td>
                  <td>
                    <span className={`badge badge-${s.status === 'active' ? 'approved' : s.status === 'withdrawn' ? 'rejected' : 'pending'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="row-actions">
                    {editable ? (
                      <>
                        <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${s.full_name}`} onClick={() => openEdit(s)}>
                          <Pencil size={15} />
                        </button>
                        <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete ${s.full_name}`} onClick={() => void remove(s)}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <span className="card-note muted-xs">roster</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MARKER:STUDMODAL */}
      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? 'Enroll student' : 'Edit student'}
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : modal?.mode === 'create' ? 'Enroll student' : 'Save changes'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="std-adm">Admission no</label>
              <input id="std-adm" type="text" value={form.admission_no} onChange={(e) => setForm({ ...form, admission_no: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="std-class">Class</label>
              <select id="std-class" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
                <option value="">Unassigned</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="std-name">Full name</label>
              <input id="std-name" type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="std-email">Email</label>
              <input id="std-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
          </div>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="std-dob">Date of birth</label>
              <input id="std-dob" type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="std-gender">Gender</label>
              <select id="std-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">—</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          {modal?.mode === 'create' && (
            <>
              <div className="field">
                <label htmlFor="std-account">Link student account (optional)</label>
                <select id="std-account" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })}>
                  <option value="">No linked account</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email} · {p.role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
                <p className="field-hint">The linked account gets the <strong>student</strong> role via RPC.</p>
              </div>
              <div className="field">
                <label htmlFor="std-guardian">Link guardian (parent account, optional)</label>
                <select id="std-guardian" value={form.guardian_profile_id} onChange={(e) => setForm({ ...form, guardian_profile_id: e.target.value })}>
                  <option value="">No guardian account linked</option>
                  {parents.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <div className="field row-2">
            <div className="field">
              <label htmlFor="std-gname">Guardian name</label>
              <input id="std-gname" type="text" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="std-gphone">Guardian phone</label>
              <input id="std-gphone" type="tel" value={form.guardian_phone} onChange={(e) => setForm({ ...form, guardian_phone: e.target.value })} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="std-address">Address</label>
            <textarea id="std-address" rows="2" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  );
}