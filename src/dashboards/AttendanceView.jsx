import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import { ATTENDANCE_STATUS, ATTENDANCE_LABELS } from '../lib/grades.js';
import { userInitials } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

function todayStr() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export default function AttendanceView({ session }) {
  const { profile } = session;
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const loadClasses = async () => {
    const { data } = await supabase.from('classes').select('id, name').order('name');
    setClasses(data ?? []);
    if (data?.length) setClassId(data[0].id);
  };

  useEffect(() => {
    void loadClasses();
  }, []);

  async function loadDay(cId, day) {
    if (!cId) return;
    setLoading(true);
    setMessage(null);
    const { data: roster } = await supabase
      .from('student_records')
      .select('id, full_name, admission_no')
      .eq('class_id', cId)
      .eq('status', 'active')
      .order('full_name');
    setStudents(roster ?? []);

    const next = {};
    const ids = (roster ?? []).map((s) => s.id);
    if (ids.length) {
      const { data: existing } = await supabase
        .from('attendance')
        .select('student_record_id, status')
        .in('student_record_id', ids)
        .eq('date', day);
      for (const a of existing ?? []) next[a.student_record_id] = a.status;
    }
    setMarks(next);
    setLoading(false);
  }

  useEffect(() => {
    void loadDay(classId, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId, date]);

  const setStatus = (id, status) => {
    setMarks({ ...marks, [id]: status });
  };

  const save = async () => {
    const rows = students.map((st) => ({
      student_record_id: st.id,
      date,
      status: marks[st.id] ?? 'present',
      marked_by: profile?.id,
    }));
    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from('attendance')
      .upsert(rows, { onConflict: 'student_record_id,date' });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: `Could not save attendance: ${error.message}` });
      return;
    }
    setMessage({
      type: 'success',
      text: `Attendance saved for ${students.length} students on ${date}.`,
    });
    void loadDay(classId, date);
  };

  const counts = students.reduce(
    (acc, st) => {
      const s = marks[st.id] ?? 'present';
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    },
    {},
  );

  // MARKER:ATTRENDER
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 3 · Academics"
        title="Attendance"
        sub="Take the register for a class & day. RLS limits staff to their own classes."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadDay(classId, date)} disabled={loading}>
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
        <div className="filters">
          <select className="filter-select" aria-label="Class" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            className="filter-select date-input"
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="attend-summary">
          <span className="attend-chip present">{counts.present ?? 0} present</span>
          <span className="attend-chip late">{counts.late ?? 0} late</span>
          <span className="attend-chip absent">{counts.absent ?? 0} absent</span>
          <span className="attend-chip excused">{counts.excused ?? 0} excused</span>
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : students.length === 0 ? (
        <div className="card">
          <p className="card-note">No active students in this class for the selected day.</p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no</th>
                <th colSpan={ATTENDANCE_STATUS.length}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const current = marks[st.id] ?? 'present';
                return (
                  <tr key={st.id}>
                    <td>
                      <span className="cell-avatar">{userInitials(st.full_name)}</span>
                      {st.full_name}
                    </td>
                    <td><code className="mono-chip">{st.admission_no}</code></td>
                    <td className="attendance-actions" colSpan={ATTENDANCE_STATUS.length}>
                      {ATTENDANCE_STATUS.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={`attend-btn ${status} ${current === status ? 'active' : ''}`}
                          onClick={() => setStatus(st.id, status)}
                        >
                          {ATTENDANCE_LABELS[status]}
                        </button>
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="save-bar">
        <span className="card-note">
          {students.length} students on {date} · marks persist per student & day
        </span>
        <button type="button" className="btn btn-primary" disabled={busy || loading} onClick={() => void save()}>
          <Save size={16} /> Save register
        </button>
      </div>
    </div>
  );
}