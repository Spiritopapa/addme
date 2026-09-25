import { ShieldAlert, LogOut } from 'lucide-react';
import { signOut } from '../lib/auth.js';

export default function SuspendedScreen() {
  return (
    <div className="page-center card">
      <span className="big-icon"><ShieldAlert size={40} /></span>
      <h2>Account suspended</h2>
      <p>
        Your account has been deactivated by a school administrator.
        Contact your school admin or the system owner to restore access.
      </p>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => void signOut()}
      >
        <LogOut size={16} /> Sign out
      </button>
    </div>
  );
}