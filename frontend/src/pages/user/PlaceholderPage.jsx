export function PlaceholderPage({ title, icon }) {
  return (
    <div>
      <h1 className="u-page-title">{title}</h1>
      <div className="u-card u-empty-state">
        <div className="u-empty-state-icon">{icon}</div>
        Nothing here yet — coming soon.
      </div>
    </div>
  );
}
