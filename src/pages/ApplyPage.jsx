import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AdmissionForm from '../components/AdmissionForm.jsx';

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="apply-page">
      <div className="landing-blobs" aria-hidden="true"><span /><span /></div>

      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <span className="landing-logo">✦</span> EduSphere
        </Link>
        <div className="landing-links">
          <Link to="/" className="landing-link">Home</Link>
          <Link to="/auth" className="btn btn-primary btn-sm">Sign in</Link>
        </div>
      </nav>

      <main className="apply-main">
        <Link to="/" className="back-link">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <header className="apply-header">
          <h1>Apply for admission</h1>
          <p>
            Fill the form below to start the admission process. Your
            application will be reviewed by the school admin.
          </p>
        </header>

        {submitted && (
          <div className="banner banner-success" role="status">
            ✨ Application submitted · A confirmation banner will appear here after review.
          </div>
        )}

        <div className="card panel-flat">
          <AdmissionForm onSubmitted={() => setSubmitted(true)} />
        </div>
      </main>
    </div>
  );
}