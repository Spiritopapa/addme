// ---------------------------------------------------------------------------
// CSV export helper (client-side, no server required)
// ---------------------------------------------------------------------------

export function downloadCsv(filename, rows, columns) {
  const escape = (value) => {
    const s = value == null ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = columns.map((c) => c.label).join(',');
  const lines = rows.map((r) => columns.map((c) => escape(c.get(r))).join(','));
  const blob = new Blob([`\uFEFF${header}\n${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}