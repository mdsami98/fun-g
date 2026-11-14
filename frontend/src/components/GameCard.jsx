import { Icon } from './Icon';
import '../styles/games.css';

/**
 * Flat poster tile (design-system/aviator/pages/lobby.md): the top area is
 * the game's solid --art-a colour with its Phosphor fill icon in --art-b;
 * the bottom --art-b band carries the title and provider · players.
 * `game.icon` is an icon name from components/iconPaths.js.
 */
export function GameCard({ game, onOpen }) {
  const longestWord = Math.max(...game.name.split(/\s+/).map((word) => word.length));

  return (
    <button
      type="button"
      className="g-poster"
      data-art={game.art}
      style={{ '--w': longestWord }}
      onClick={() => onOpen(game)}
    >
      <span className="g-poster-art" aria-hidden="true">
        <Icon name={game.icon} weight="fill" size={64} />
      </span>
      {game.badge && <span className={`g-poster-badge ${game.badge}`}>{game.badge}</span>}
      <span className="g-poster-band">
        <span className="g-poster-title">{game.name}</span>
        <span className="g-poster-meta">
          <span className="g-poster-provider">{game.provider}</span>
          {game.players != null && (
            <span className="g-poster-players">
              <Icon name="users" weight="fill" size={16} />
              {game.players.toLocaleString('en-US')}
              <span className="g-vh"> playing</span>
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
