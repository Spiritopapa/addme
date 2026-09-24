import { useState } from 'react';
import AdmissionForm from './components/AdmissionForm.jsx';
import StudentList from './components/StudentList.jsx';
import { supabaseConfigured } from './lib/supabase.js';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <h1>🎓 Student Admission Portal</h1>
        <p>Simple admission application built with React, Supabase &amp; Vercel.</p>
      </header>

      {!supabaseConfigured && (
        <div className="banner banner-warning" role="alert">
          ⚠️ Supabase is not configured yet. Copy <code>.env.example</code> to{' '}
          <code>.env</code>, fill in your <code>VITE_SUPABASE_URL</code> and{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>, then restart{' '}
          <code>npm run dev</code>.
        </div>
      )}

      <main className="layout">
        <section className="panel">
          <h2>Admission form</h2>
          <AdmissionForm onSubmitted={() => setRefreshKey((key) => key + 1)} />
        </section>

        <section className="panel">
          <h2>Applications</h2>
          <StudentList refreshKey={refreshKey} />
        </section>
      </main>

      <footer className="footer">
        Student Admission App · React + Supabase · Deployed on Vercel
      </footer>
    </div>
  );
}