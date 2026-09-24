import { useEffect, useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase.js';

const STATUS_LABELS = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function StudentList({ refreshKey }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStudents = async () => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setStudents(data ?? []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, [refreshKey]);

  if (!supabaseConfigured) {
    return (
      <p className="empty-state">
        Configure Supabase to see submitted applications here.
      </p>
    );
  }

  if (loading) {
    return <p className="empty-state">Loading applications…</p>;
  }

  if (error) {
    return (
      <div className="banner banner-error" role="alert">
        Could not load applications: {error}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <p className="empty-state">
        No applications yet. Submit the form to create your first one!
      </p>
    );
  }

  return (
    <table className="students-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Program</th>
          <th>GPA</th>
          <th>Status</th>
          <th>Applied</th>
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.id}>
            <td>{student.full_name}</td>
            <td>{student.email}</td>
            <td>{student.program}</td>
            <td>{student.previous_gpa ?? '—'}</td>
            <td>
              <span className={`badge badge-${student.status}`}>
                {STATUS_LABELS[student.status] ?? student.status}
              </span>
            </td>
            <td>{formatDate(student.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}