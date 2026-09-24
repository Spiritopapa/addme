import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, RefreshCw, UserCog } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { supabase } from '../lib/supabase.js';

const EMPTY = {
  profile_id: '',
  employee_no: '',
  department: 'Teaching',
  position: 'Teacher',
  phone: '',
};

export default function StaffView() {
  const [rows, setRows] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('staff_records')
      .select('*')
      .order('full_name');
    if (error) {
      setMessage({ type: 'error', text: `Could not load staff: ${error.message}` });
    } else {
      setRows(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const loadProfiles = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role')
      .order('full_name');
    const existing = new Set((rows ?? []).map((r) => r.profile_id));
    // Show accounts without an employment record yet
    setProfiles((data ?? []).filter((p) => !existing.has(p.id)));
  };

  const openCreate = async () => {
    setForm(EMPTY);
    setModal({ mode: 'create', item: null });
    void loadProfiles();
  };

  const openEdit = (item) => {
    setForm({
      profile_id: item.profile_id,
      employee_no: item.employee_no,
      department: item.department,
      position: item.position,
      phone: item.phone ?? '',
    });
    setModal({ mode: 'edit', item });
  };

  const save = async () => {
    const profile = profiles.find((p) => p.id === form.profile_id);
    const payload = {
      department: form.department.trim(),
      position: form.position.trim(),
      phone: form.phone.trim() || null,
    };
    if (!payload.department || !payload.position) {
      setMessage({ type: 'error', text: 'Department and position are required.' });
      return;
    }

    setBusy(true);
    setMessage(null);

    if (modal.mode === 'create') {
      if (!form.profile_id) {
        setBusy(false);
        setMessage({ type: 'error', text: 'Pick the account to link to this employment record.' });
        return;
      }
      // Provision the role server-side (RLS-protected RPC)
      const { error: roleError } = await supabase.rpc('admin_set_role', {
        p_user_id: form.profile_id,
        p_role: 'staff',
      });
      if (roleError) {
        setBusy(false);
        setMessage({ type: 'error', text: `Role provisioning failed: ${roleError.message}` });
        return;
      }
      const { error } = await supabase.from('staff_records').insert({
        profile_id: form.profile_id,
        full_name: profile?.full_name ?? '—',
        email: profile?.email,
        employee_no: form.employee_no.trim() || `EMP-${Date.now().toString().slice(-6)}`,
        ...payload,
      });
      if (error) {
        setBusy(false);
        setMessage({ type: 'error', text: error.message });
        return;
      }
    } else {
      const { error } = await supabase
        .from('staff_records')
        .update({ ...payload, employee_no: form.employee_no.trim() || null })
        .eq('id', modal.item.id);
      if (error) {
        setBusy(false);
        setMessage({ type: 'error', text: error.message });
        return;
      }
    }

    setBusy(false);
    setModal(null);
    setMessage({ type: 'success', text: 'Staff record saved.' });
    void load();
  };

  const remove = async (item) => {
    if (!window.confirm(`Remove ${item.full_name} from the staff directory? The account itself is kept.`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('staff_records').delete().eq('id', item.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Staff record removed.' });
    void load();
  };

  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 2 · Administration"
        title="Staff directory"
        sub="Employment records for every member of staff. Each entry is linked to a sign-in account."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void openCreate()}>
            <Plus size={15} /> Add staff
          </button>
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
          <p className="card-note">
            The directory is empty. Use “Add staff” to link an account — their role is
            provisioned to <strong>staff</strong> automatically.
          </p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Employee no</th>
                <th>Department</th>
                <th>Position</th>
                <th>Contact</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className="cell-avatar"><UserCog size={14} /></span>
                    {s.full_name}
                  </td>
                  <td><code className="mono-chip">{s.employee_no}</code></td>
                  <td>{s.department}</td>
                  <td>{s.position}</td>
                  <td>{s.phone ?? s.email ?? '—'}</td>
                  <td className="row-actions">
                    <button type="button" className="icon-btn" title="Edit" aria-label={`Edit ${s.full_name}`} onClick={() => openEdit(s)}>
                      <Pencil size={15} />
                    </button>
                    <button type="button" className="icon-btn danger" title="Remove" aria-label={`Remove ${s.full_name}`} onClick={() => void remove(s)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MARKER:STAFFMODAL */}
      <Modal
        open={!!modal}
        title={modal?.mode === 'create' ? 'Add staff member' : 'Edit staff record'}
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : modal?.mode === 'create' ? 'Add to directory' : 'Save changes'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {modal?.mode === 'create' && (
            <div className="field">
              <label htmlFor="stf-account">Link an existing account</label>
              <select id="stf-account" value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })} required>
                <option value="">Choose an account…</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email} · {p.role.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <p className="field-hint">
                Their role is provisioned to <strong>staff</strong> by the
                RLS-protected <code>admin_set_role</code> RPC.
              </p>
            </div>
          )}
          {modal?.mode === 'edit' && form.profile_id && (
            <div className="field">
              <label>Linked account</label>
              <input type="text" value={rows.find((r) => r.id === modal.item?.id)?.full_name ?? ''} disabled />
            </div>
          )}
          <div className="field">
            <label htmlFor="stf-employee">Employee number</label>
            <input id="stf-employee" type="text" value={form.employee_no} onChange={(e) => setForm({ ...form, employee_no: e.target.value })} placeholder="e.g. STF-001" required />
          </div>
          <div className="field">
            <label htmlFor="stf-dept">Department</label>
            <input id="stf-dept" type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="e.g. Teaching" required />
          </div>
          <div className="field">
            <label htmlFor="stf-position">Position</label>
            <input id="stf-position" type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Mathematics Teacher" required />
          </div>
          <div className="field">
            <label htmlFor="stf-phone">Phone</label>
            <input id="stf-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </div>
        </form>
      </Modal>
    </div>
  );
}