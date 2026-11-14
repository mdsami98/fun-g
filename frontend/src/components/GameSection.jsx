import { useCallback, useEffect, useRef, useState } from 'react';
import { GameCard } from './GameCard';
import { Icon } from './Icon';

/** 'auto' under prefers-reduced-motion, otherwise 'smooth'. */
export function scrollBehavior() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

/**
 * Lobby row: titled, horizontally scrolling posters with All + ‹ ›.
 * The ‹ › buttons are the non-swipe alternative; "All" opens the full
 * category grid (handled by the parent).
 */
export function GameSection({ icon, title, games, onOpen, onAll }) {
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  const updateEdges = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdges({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft >= max - 2 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener('resize', updateEdges);
    return () => window.removeEventListener('resize', updateEdges);
  }, [updateEdges]);

  const page = (dir) => {
    const el = rowRef.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: scrollBehavior() });
  };

  if (games.length === 0) return null;

  return (
    <section className="g-section" aria-label={title}>
      <div className="g-sec-hd">
        <h2 className="g-sec-title">
          <span className="g-sec-icon">
            <Icon name={icon} weight="fill" size={24} />
          </span>
          {title}
        </h2>

        <div className="g-sec-actions">
          <button type="button" className="g-sec-btn" aria-label={`All ${title} games`} onClick={onAll}>
            All
          </button>
          <button
            type="button"
            className="g-sec-btn icon"
            aria-label={`Previous ${title} games`}
            disabled={edges.atStart}
            onClick={() => page(-1)}
          >
            <Icon name="caret-left" size={20} />
          </button>
          <button
            type="button"
            className="g-sec-btn icon"
            aria-label={`Next ${title} games`}
            disabled={edges.atEnd}
            onClick={() => page(1)}
          >
            <Icon name="caret-right" size={20} />
          </button>
        </div>
      </div>

      <div ref={rowRef} className="g-row" onScroll={updateEdges}>
        {games.map((game) => (
          <GameCard key={game.key} game={game} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
