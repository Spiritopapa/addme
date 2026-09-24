export default function LoadingScreen() {
  return (
    <div className="loading-screen" role="status" aria-live="polite">
      <div className="loading-orbit">
        <span />
        <span />
      </div>
      <p>Loading your portal…</p>
    </div>
  );
}