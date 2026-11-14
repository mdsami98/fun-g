import { GameCard } from './GameCard';
import { Icon } from './Icon';

const COLUMNS = 3;

/**
 * 3-column poster grid that never leaves a gap: a trailing action tile
 * ("Load more" by default) spans exactly the empty cells of the last row,
 * or takes a full row of its own when the games divide evenly.
 */
export function GameGrid({ games, onOpen, action = {} }) {
  const { label = 'Load more', sub = 'More games', onClick } = action;
  const remainder = games.length % COLUMNS;
  const span = remainder === 0 ? COLUMNS : COLUMNS - remainder;
  const shape = span === COLUMNS ? 'row' : span === 1 ? 'tile' : 'wide';

  return (
    <div className="g-grid">
      {games.map((game) => (
        <GameCard key={game.key} game={game} onOpen={onOpen} />
      ))}
      <button
        type="button"
        className={`g-more ${shape}`}
        style={{ gridColumn: `span ${span}` }}
        onClick={onClick}
      >
        <span className="g-more-icon">
          <Icon name="caret-down" size={20} />
        </span>
        <span className="g-more-text">
          <span className="g-more-label">{label}</span>
          <span className="g-more-sub">{sub}</span>
        </span>
      </button>
    </div>
  );
}
