import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase.js';

const PROGRAMS = [
  'Computer Science',
  'Data Science',
  'Software Engineering',
  'Business Administration',
  'Mechanical Engineering',
  'Electrical Engineering',
  'Nursing',
  'Psychology',
];

const EMPTY_FORM = {
  fullName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '',
  program: '',
  address: '',
  previousGpa: '',
};

export default function AdmissionForm({ onSubmitted }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }

  const update = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);

    if (!supabaseConfigured) {
      setMessage({
        type: 'error',
        text: 'Supabase is not configured. Add your keys to .env first (see README).',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('students').insert({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || null,
        date_of_birth: form.dateOfBirth || null,
        gender: form.gender || null,
        address: form.address.trim() || null,
        program: form.program,
        previous_gpa: form.previousGpa ? Number(form.previousGpa) : null,
        status: 'pending',
      });

      if (error) {
        const isDuplicateEmail = error.code === '23505';
        setMessage({
          type: 'error',
          text: isDuplicateEmail
            ? 'An application with this email already exists.'
            : `Could not submit application: ${error.message}`,
        });
        return;
      }

      setMessage({ type: 'success', text: 'Application submitted successfully!' });
      setForm(EMPTY_FORM);
      onSubmitted();
    } catch (err) {
      setMessage({ type: 'error', text: `Unexpected error: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="admission-form" onSubmit={handleSubmit} noValidate>
      {message && (
        <div className={`banner banner-${message.type}`} role="status">
          {message.text}
        </div>
      )}

      <div className="field">
        <label htmlFor="fullName">Full name *</label>
        <input
          id="fullName"
          type="text"
          value={form.fullName}
          onChange={update('fullName')}
          placeholder="e.g. Aisha Bello"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email address *</label>
        <input
          id="email"
          type="email"
          value={form.email}
          onChange={update('email')}
          placeholder="name@example.com"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="phone">Phone number</label>
        <input
          id="phone"
          type="tel"
          value={form.phone}
          onChange={update('phone')}
          placeholder="+234 800 000 0000"
        />
      </div>

      <div className="field">
        <label htmlFor="dateOfBirth">Date of birth</label>
        <input
          id="dateOfBirth"
          type="date"
          value={form.dateOfBirth}
          onChange={update('dateOfBirth')}
        />
      </div>

      <div className="field">
        <label htmlFor="gender">Gender</label>
        <select id="gender" value={form.gender} onChange={update('gender')}>
          <option value="">Select…</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="program">Program of study *</label>
        <select id="program" value={form.program} onChange={update('program')} required>
          <option value="">Select a program…</option>
          {PROGRAMS.map((program) => (
            <option key={program} value={program}>
              {program}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="previousGpa">Previous GPA (0.0 – 4.0)</label>
        <input
          id="previousGpa"
          type="number"
          min="0"
          max="4"
          step="0.01"
          value={form.previousGpa}
          onChange={update('previousGpa')}
          placeholder="e.g. 3.45"
        />
      </div>

      <div className="field">
        <label htmlFor="address">Address</label>
        <textarea
          id="address"
          rows="3"
          value={form.address}
          onChange={update('address')}
          placeholder="Street, city, state…"
        />
      </div>

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Submitting…' : 'Submit application'}
      </button>
    </form>
  );
}