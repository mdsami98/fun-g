import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { scrollBehavior } from './GameSection';

export function SearchBar({ value, onChange }) {
  return (
    <div className="g-search">
      <Icon name="magnifying-glass" size={20} className="g-search-ico" />
      <input
        type="search"
        className="g-search-input"
        placeholder="Search games"
        aria-label="Search games"
        enterKeyHint="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" className="g-search-clear" aria-label="Clear search" onClick={() => onChange('')}>
          <Icon name="x" size={20} />
        </button>
      )}
    </div>
  );
}

/**
 * Horizontally scrolling category chips. The trailing arrow pages the
 * strip right; once at the end it flips and jumps back to the start.
 */
export function CategoryChips({ tabs, active, onSelect }) {
  const stripRef = useRef(null);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = stripRef.current;
    if (el) setAtEnd(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [update]);

  // Keep the selected chip visible when it changes (e.g. via a section's "All").
  useEffect(() => {
    stripRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: scrollBehavior() });
  }, [active]);

  const step = () => {
    const el = stripRef.current;
    if (!el) return;
    if (atEnd) el.scrollTo({ left: 0, behavior: scrollBehavior() });
    else el.scrollBy({ left: el.clientWidth * 0.6, behavior: scrollBehavior() });
  };

  return (
    <div className="g-chips-wrap">
      <div className="g-chips" ref={stripRef} role="tablist" aria-label="Game categories" onScroll={update}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.key === active}
            className={`g-chip${tab.key === active ? ' active' : ''}`}
            onClick={() => onSelect(tab.key)}
          >
            <Icon name={tab.icon} weight="fill" size={20} />
            {tab.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="g-sec-btn icon g-chips-next"
        aria-label={atEnd ? 'Back to first category' : 'More categories'}
        onClick={step}
      >
        <Icon name={atEnd ? 'caret-left' : 'caret-right'} size={20} />
      </button>
    </div>
  );
}
