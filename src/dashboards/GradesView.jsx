import { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';
import PageTitle from '../components/ui/PageTitle.jsx';
import { TERMS, letterFor, LETTER_COLORS } from '../lib/grades.js';
import { userInitials } from '../lib/auth.js';
import { supabase } from '../lib/supabase.js';

export default function GradesView({ session }) {
  const { profile } = session;
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [term, setTerm] = useState(TERMS[0]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
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

  const classSubjects = subjects.filter((s) => !s.class_id || s.class_id === classId);

  useEffect(() => {
    if (!classId) return;
    setSubjectId(classSubjects[0]?.id ?? '');
    void loadStudents(classId, classSubjects[0]?.id ?? '', term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function loadStudents(cId, subId, termName) {
    setLoading(true);
    setMessage(null);
    const { data: roster } = await supabase
      .from('student_records')
      .select('id, full_name, admission_no')
      .eq('class_id', cId)
      .eq('status', 'active')
      .order('full_name');
    const students = roster ?? [];
    setStudents(students);

    const next = {};
    if (subId) {
      const ids = students.map((s) => s.id);
      if (ids.length) {
        const { data: existing } = await supabase
          .from('grades')
          .select('student_record_id, score')
          .in('student_record_id', ids)
          .eq('subject_id', subId)
          .eq('term', termName);
        for (const g of existing ?? []) {
          next[g.student_record_id] = g.score != null ? String(g.score) : '';
        }
      }
    }
    setScores(next);
    setLoading(false);
  }

  useEffect(() => {
    void loadStudents(classId, subjectId, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, term]);

  const save = async () => {
    const rows = students
      .map((st) => ({
        student_record_id: st.id,
        subject_id: subjectId,
        term,
        score: scores[st.id] === '' ? null : Number(scores[st.id]),
        grade_letter: letterFor(scores[st.id]),
        recorded_by: profile?.id,
      }))
      .filter((r) => r.score !== null);

    if (!subjectId) {
      setMessage({ type: 'error', text: 'Pick a subject first.' });
      return;
    }
    if (rows.length === 0) {
      setMessage({ type: 'warning', text: 'No scores entered to save.' });
      return;
    }

    setBusy(true);
    setMessage(null);
    const { error } = await supabase
      .from('grades')
      .upsert(rows, { onConflict: 'student_record_id,subject_id,term' });
    setBusy(false);
    if (error) {
      setMessage({ type: 'error', text: `Could not save grades: ${error.message}` });
      return;
    }
    setMessage({
      type: 'success',
      text: `Saved ${rows.length} result${rows.length > 1 ? 's' : ''} for ${term}.`,
    });
    void loadStudents(classId, subjectId, term);
  };

  const totals = students.reduce(
    (acc, st) => {
      const v = scores[st.id];
      if (v !== undefined && v !== '') {
        acc.entered += 1;
        if (Number(v) >= 50) acc.passed += 1;
      }
      return acc;
    },
    { entered: 0, passed: 0 },
  );

  // MARKER:GRADESRENDER
  return (
    <div className="dashboard">
      <PageTitle
        eyebrow="Level 3 · Academics"
        title="Grades"
        sub="Record scores per subject & term. Letters are computed for you; RLS lets teachers mark only their own class."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void loadStudents(classId, subjectId, term)} disabled={loading}>
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
          <select className="filter-select" aria-label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {classSubjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {classSubjects.length === 0 && <option value="">No subjects yet</option>}
          </select>
          <select className="filter-select" aria-label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
            {TERMS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <span className="score-summary">
          {totals.entered}/{students.length} entered · {totals.passed} scored ≥ 50
        </span>
      </div>

      {loading ? (
        <div className="card"><div className="skeleton-table" aria-hidden="true" /></div>
      ) : students.length === 0 ? (
        <div className="card">
          <p className="card-note">
            No active students in this class — and remember, as staff you can
            only see the classes you teach (RLS).
          </p>
        </div>
      ) : (
        <div className="table-wrap card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission no</th>
                <th>Score (0–100)</th>
                <th>Grade</th>
                <th aria-label="status" />
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                const value = scores[st.id] ?? '';
                const letter = letterFor(value);
                return (
                  <tr key={st.id}>
                    <td>
                      <span className="cell-avatar">{userInitials(st.full_name)}</span>
                      {st.full_name}
                    </td>
                    <td><code className="mono-chip">{st.admission_no}</code></td>
                    <td>
                      <input
                        className="score-input"
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={value}
                        aria-label={`Score for ${st.full_name}`}
                        onChange={(e) => setScores({ ...scores, [st.id]: e.target.value })}
                      />
                    </td>
                    <td>
                      {letter ? (
                        <span
                          className="grade-pill"
                          style={{ color: LETTER_COLORS[letter], borderColor: LETTER_COLORS[letter] }}
                        >
                          {letter}
                        </span>
                      ) : (
                        <span className="muted-xs">—</span>
                      )}
                    </td>
                    <td>
                      {value === undefined || value === '' ? (
                        <span className="muted-xs">unset</span>
                      ) : Number(value) >= 50 ? (
                        <span className="grade-tick ok">pass</span>
                      ) : (
                        <span className="grade-tick fail">fail</span>
                      )}
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
          Grade scale — A: 80+ · B: 70–79 · C: 60–69 · D: 50–59 · F: below 50
        </span>
        <button type="button" className="btn btn-primary" disabled={busy || loading} onClick={() => void save()}>
          <Save size={16} /> Save {term}
        </button>
      </div>
    </div>
  );
}