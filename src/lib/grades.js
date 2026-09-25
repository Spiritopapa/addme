// ---------------------------------------------------------------------------
// Academic helpers (Level 3)
// ---------------------------------------------------------------------------

export const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export const ATTENDANCE_STATUS = ['present', 'late', 'absent', 'excused'];

export const ATTENDANCE_LABELS = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  excused: 'Excused',
};

export const GRADE_ORDERS = { A: 1, B: 2, C: 3, D: 4, F: 5 };

export function letterFor(score) {
  if (score === null || score === undefined || score === '') return null;
  const s = Number(score);
  if (Number.isNaN(s)) return null;
  if (s >= 80) return 'A';
  if (s >= 70) return 'B';
  if (s >= 60) return 'C';
  if (s >= 50) return 'D';
  return 'F';
}

export const LETTER_COLORS = {
  A: 'var(--accent)',
  B: '#0ea5e9',
  C: '#f59e0b',
  D: '#f97316',
  F: 'var(--danger)',
};

export function averageLetter(grades) {
  if (!grades.length) return '—';
  const sum = grades.reduce((acc, g) => acc + (Number(g.score) ?? 0), 0);
  return letterFor(sum / grades.length) ?? '—';
}

export function avgScore(grades) {
  const scores = (grades ?? []).map((g) => Number(g.score)).filter((s) => !Number.isNaN(s));
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function attendanceRate(records) {
  if (!records?.length) return null;
  const present = records.filter((r) => r.status === 'present').length;
  return Math.round((present / records.length) * 100);
}