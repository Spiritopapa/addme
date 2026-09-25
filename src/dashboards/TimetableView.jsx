import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Clock } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import Modal from '../components/ui/Modal.jsx';
import { DAYS } from '../lib/grades.js';
import { canManage } from '../lib/roles.js';
import { supabase } from '../lib/supabase.js';

const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

export default function TimetableView({ session }) {
  const editable = canManage(session.user);
  const myId = session.profile?.id;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [slots, setSlots] = useState([]);
  const [classId, setClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ day: 'Monday', period: 1, subject_id: '', start_time: '08:00', end_time: '08:50' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadMeta = async () => {
    const { data: cls } = await supabase.from('classes').select('id, name').order('name');
    const { data: subs } = await supabase.from('subjects').select('*').order('name');
    setClasses(cls ?? []);
    setSubjects(subs ?? []);
    if (cls?.length) setClassId(cls[0].id);
  };

  useEffect(() => {
    void loadMeta();
  }, []);

  useEffect(() => {
    if (!classId) return;
    void loadSlots(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function loadSlots(cId) {
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase
      .from('timetable')
      .select('*')
      .eq('class_id', cId);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      setSlots([]);
    } else {
      setSlots(data ?? []);
    }
    setLoading(false);
  }

  const subjectById = (id) => subjects.find((s) => s.id === id);

  const slotAt = (day, period) => slots.find((s) => s.day === day && s.period === period);

  const openCell = (day, period) => {
    if (!editable) return;
    const existing = slotAt(day, period);
    setForm({
      day,
      period,
      subject_id: existing?.subject_id ?? '',
      start_time: existing?.start_time ?? '08:00',
      end_time: existing?.end_time ?? '08:50',
    });
    setModal({ day, period, existing });
  };

  const saveSlot = async () => {
    if (!form.subject_id) {
      setMessage({ type: 'error', text: 'Choose a subject for the slot.' });
      return;
    }
    setBusy(true);
    setMessage(null);
    const payload = {
      class_id: classId,
      day: form.day,
      period: Number(form.period),
      subject_id: form.subject_id,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
    };
    const { error } = modal?.existing
      ? await supabase.from('timetable').update(payload).eq('id', modal.existing.id)
      : await supabase.from('timetable').upsert(payload, { onConflict: 'class_id,day,period' });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: 'Slot saved.' });
    void loadSlots(classId);
  };

  const removeSlot = async (existing) => {
    if (!window.confirm('Remove this timetable slot?')) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.from('timetable').delete().eq('id', existing.id);
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: error.message });
      return;
    }
    setModal(null);
    setMessage({ type: 'success', text: 'Slot removed.' });
    void loadSlots(classId);
  };

  // MARKER:TTBODY
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 3 · Academics"
        title="Weekly timetable"
        sub={editable
          ? 'Click any cell to add or edit a lesson. Other roles view read-only.'
          : 'View the class timetable. Admins manage the slots.'}
        actions={
          <div className="toolbar-simple">
            <select className="filter-select" aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
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
      ) : (
        <div className="table-wrap card tt-wrap">
          <table className="data-table tt-grid">
            <thead>
              <tr>
                <th />
                {DAYS.map((d) => (
                  <th key={d} className="tt-day">{d.slice(0, 3)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map((period) => (
                <tr key={period}>
                  <th className="tt-period">P{period}</th>
                  {DAYS.map((day) => {
                    const slot = slotAt(day, period);
                    const subj = slot ? subjectById(slot.subject_id) : null;
                    const mine = slot && subj && subj.teacher_profile_id === myId;
                    return (
                      <td
                        key={day}
                        className={`tt-cell ${editable ? 'clickable' : ''} ${slot ? 'filled' : ''}`}
                        onClick={() => openCell(day, period)}
                        role="button"
                        aria-label={`${day} period ${period}${slot ? `: ${subj?.name}` : ''}`}
                      >
                        {slot && subj ? (
                          <span className={`tt-subject ${mine ? 'mine' : ''}`}>
                            {subj.name}
                            {subj.code && <em>{subj.code}</em>}
                            {slot.start_time && <time>{slot.start_time}</time>}
                          </span>
                        ) : editable ? (
                          <span className="tt-empty">+</span>
                        ) : (
                          <span className="tt-empty">·</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editable && (
        <p className="card-note tt-hint">
          Click a cell to add a lesson · click a filled cell to edit or remove it.
        </p>
      )}

      {/* MARKER:TTMODAL */}
      <Modal
        open={!!modal}
        title={modal?.existing ? 'Edit lesson' : 'Add lesson'}
        onClose={() => setModal(null)}
        footer={
          <div className="modal-foot-inline">
            {modal?.existing && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void removeSlot(modal.existing)}>
                <Trash2 size={15} /> Remove
              </button>
            )}
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => void saveSlot()}>
              {busy ? 'Saving…' : 'Save lesson'}
            </button>
          </div>
        }
      >
        <form className="modal-form" onSubmit={(e) => { e.preventDefault(); void saveSlot(); }}>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="tt-day">Day</label>
              <select id="tt-day" value={form.day} onChange={(e) => setForm({ ...form, day: e.target.value })}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tt-period">Period</label>
              <select id="tt-period" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })}>
                {PERIODS.map((p) => (
                  <option key={p} value={p}>Period {p}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="tt-subject">Subject</label>
            <select id="tt-subject" value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
              <option value="">Choose a subject…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="field row-2">
            <div className="field">
              <label htmlFor="tt-start">Starts</label>
              <input id="tt-start" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="tt-end">Ends</label>
              <input id="tt-end" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}