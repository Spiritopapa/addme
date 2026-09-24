import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function SettingsPlaceholder() {
  return (
    <div className="page-center card">
      <span className="big-icon"><Construction size={40} /></span>
      <h2>Settings</h2>
      <p>
        Profile settings & preferences arrive in a later level. For now, enjoy
        the portals.
      </p>
      <Link to="/app" className="btn btn-primary">Back to dashboard</Link>
    </div>
  );
}