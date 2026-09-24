export default function PageTitle({ eyebrow, title, sub, actions }) {
  return (
    <header className="page-title">
      <div>
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}