import { useEffect, useState } from 'react';
import { Plus, RefreshCw, WalletCards, BadgeDollarSign, Pencil, Trash2 } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import StatCard from '../components/ui/StatCard.jsx';
import { formatDate } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

const METHODS = ['cash', 'card', 'mobile_money', 'bank'];
const METHOD_LABELS = { cash: 'Cash', card: 'Card', mobile_money: 'Mobile money', bank: 'Bank transfer' };

const money = (v) => {
  const n = Number(v ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function feeStatus(fee) {
  const balance = Math.max(0, Number(fee.amount) - Number(fee.paid_amount));
  if (balance <= 0) return 'paid';
  if (Number(fee.paid_amount) > 0) return 'partial';
  return 'unpaid';
}

export default function FeesView({ session }) {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [rows, setRows] = useState([]);
  const [classId, setClassId] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const load = async () => {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.from('fees').select('*').order('created_at', { ascending: false });
    if (error) {
      setMessage({ type: 'error', text: `Could not load fees: ${error.message}` });
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
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      if (!classId) return;
      const { data } = await supabase
        .from('student_records')
        .select('id, full_name, admission_no')
        .eq('class_id', classId)
        .eq('status', 'active')
        .order('full_name');
      setStudents(data ?? []);
    })();
  }, [classId]);

  const studentName = (id) => students.find((s) => s.id === id)?.full_name ?? 'Unknown';

  // ── issuers & payments ────────────────────────────────────────────────
  const openIssue = () => {
    setForm({ student_record_id: students[0]?.id ?? '', description: 'Tuition', amount: '', due_date: '' });
    setModal({ type: 'issue' });
  };

  const openPay = (fee) => {
    setForm({
      fee_id: fee.id,
      max: money(Math.max(0, Number(fee.amount) - Number(fee.paid_amount))),
      amount: '',
      method: 'cash',
      reference: '',
    });
    setModal({ type: 'pay', fee });
  };

  const openEdit = (fee) => {
    setForm({
      fee_id: fee.id,
      description: fee.description,
      amount: String(fee.amount),
      due_date: fee.due_date,
    });
    setModal({ type: 'edit', fee });
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    let error = null;

    if (modal.type === 'issue') {
      const res = await supabase.from('fees').insert({
        student_record_id: form.student_record_id,
        description: form.description.trim() || 'Tuition',
        amount: Number(form.amount),
        due_date: form.due_date || null,
        issued_by: session.profile?.id,
      });
      error = res.error;
      error ??= null;
    } else if (modal.type === 'edit') {
      const res = await supabase.from('fees').update({
        description: form.description.trim(),
        amount: Number(form.amount),
        due_date: form.due_date || null,
      }).eq('id', form.fee_id);
      error = res.error;
      error ??= null;
    } else if (modal.type === 'pay') {
      const res = await supabase.rpc('pay_fee', {
        p_fee_id: form.fee_id,
        p_amount: Number(form.amount),
        p_method: form.method,
        p_reference: form.reference?.trim() || null,
      });
      error = res.error;
      error ??= null;
    }

    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message ?? String(error) });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: 'Saved.' });
    void load();
  };

  const remove = async (fee) => {
    if (!window.confirm(`Delete this ${money(fee.amount)} invoice for ${studentName(fee.student_record_id)}?`)) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('fees').delete().eq('id', fee.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setMessage({ type: 'success', text: 'Invoice deleted.' });
    void load();
  };

  // ── aggregates & filters ──────────────────────────────────────────────
  const issued = rows.reduce((a, f) => a + Number(f.amount), 0);
  const collected = rows.reduce((a, f) => a + Number(f.paid_amount), 0);
  const outstanding = Math.max(0, issued - collected);

  const visible = rows.filter((f) => {
    if (statusFilter !== 'all' && feeStatus(f) !== statusFilter) return false;
    if (query.trim()) {
      return studentName(f.student_record_id).toLowerCase().includes(query.trim().toLowerCase());
    }
    return true;
  });

  // MARKER:FEESRENDER
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 4 · Finance"
        title="Fees & payments"
        sub="Issue invoices, record payments and track balances. Payments run through the RLS-protected pay_fee RPC."
        actions={
          <div className="page-actions">
            <button type="button" className="btn btn-primary btn-sm" onClick={openIssue}>
              <Plus size={15} /> Issue invoice
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

      <div className="stat-grid stat-grid-sm">
        <StatCard label="Issued" value={`₵${money(issued)}`} icon={<WalletCards size={18} />} tone="violet" delay={0} />
        <StatCard label="Collected" value={`₵${money(collected)}`} icon={<BadgeDollarSign size={18} />} tone="emerald" delay={80} />
        <StatCard label="Outstanding" value={`₵${money(outstanding)}`} icon={<BadgeDollarSign size={18} />} tone="amber" delay={160} />
        <StatCard label="Invoices" value={rows.length} icon={<WalletCards size={18} />} tone="blue" delay={240} />
      </div>

      <div className="toolbar">
        <div className="filters">
          <select className="filter-select" aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select className="filter-select" aria-label="Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <label className="search-box" htmlFor="fee-search">
          <input id="fee-search" type="search" placeholder="Search student…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : visible.length === 0 ? (
        <div className="card">
          <p className="card-note">No invoices match. Use “Issue invoice” to bill a student.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Due</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((f) => {
                const balance = Math.max(0, Number(f.amount) - Number(f.paid_amount));
                const status = feeStatus(f);
                return (
                  <tr key={f.id} className={status === 'unpaid' ? 'row-attention' : ''}>
                    <td>{studentName(f.student_record_id)}</td>
                    <td>{f.description}</td>
                    <td>₵{money(f.amount)}</td>
                    <td>₵{money(f.paid_amount)}</td>
                    <td><strong>₵{money(balance)}</strong></td>
                    <td>
                      <span className={`badge ${status === 'paid' ? 'badge-approved' : status === 'partial' ? 'badge-pending' : 'badge-rejected'}`}>
                        {status}
                      </span>
                    </td>
                    <td>{formatDate(f.due_date)}</td>
                    <td className="row-actions">
                      <button type="button" className="icon-btn success" title="Record payment" aria-label={`Record payment for ${studentName(f.student_record_id)}`} onClick={() => openPay(f)}>
                        <BadgeDollarSign size={15} />
                      </button>
                      <button type="button" className="icon-btn" title="Edit" aria-label={`Edit invoice`} onClick={() => openEdit(f)}>
                        <Pencil size={15} />
                      </button>
                      <button type="button" className="icon-btn danger" title="Delete" aria-label={`Delete invoice`} onClick={() => void remove(f)}>
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MARKER:FEESMODALS */}
      <Modal
        open={!!modal}
        title={
          modal?.type === 'issue' ? 'Issue invoice'
            : modal?.type === 'pay' ? 'Record payment'
              : 'Edit invoice'
        }
        onClose={() => setModal(null)}
        footer={
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void save(); }}>
          {modal?.type === 'issue' && (
            <div className="field">
              <label htmlFor="fee-student">Student</label>
              <select id="fee-student" value={form.student_record_id} onChange={(e) => setForm({ ...form, student_record_id: e.target.value })}>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name} · {s.admission_no}</option>
                ))}
              </select>
              <p className="field-hint">Roster for the selected class in the toolbar.</p>
            </div>
          )}
          <div className="field">
            <label htmlFor="fee-desc">Description</label>
            <input id="fee-desc" type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Term 1 Tuition" required />
          </div>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="fee-amount">{modal?.type === 'pay' ? 'Amount (max ₵' + (form.max ?? '') + ')' : 'Amount (₵)'}</label>
              <input id="fee-amount" type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="field">
              {modal?.type === 'pay' ? (
                <>
                  <label htmlFor="fee-method">Method</label>
                  <select id="fee-method" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>{METHOD_LABELS[m]}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label htmlFor="fee-due">Due date</label>
                  <input id="fee-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </>
              )}
            </div>
          </div>
          {modal?.type === 'pay' && (
            <div className="field">
              <label htmlFor="fee-ref">Reference</label>
              <input id="fee-ref" type="text" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Receipt / transaction no (optional)" />
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}