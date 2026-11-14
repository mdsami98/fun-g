import { Icon } from '../../components/Icon';

export function PlaceholderPage({ title, icon }) {
  return (
    <div>
      <h1 className="u-page-title">{title}</h1>
      <div className="u-card u-empty-state">
        <div className="u-empty-state-icon">
          <Icon name={icon} weight="fill" size={36} />
        </div>
        <div className="u-empty-state-title">Coming soon</div>
        Nothing here yet — check back shortly.
      </div>
    </div>
  );
}
