import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GameSection, scrollBehavior } from '../../components/GameSection';
import { GameGrid } from '../../components/GameGrid';
import { CategoryChips, SearchBar } from '../../components/LobbyControls';
import { Icon } from '../../components/Icon';
import '../../styles/home.css';

/* Banner slides. `tone` picks the slide's solid colour (home.css);
   `art` is a fill-weight icon name. */
const SLIDES = [
  {
    key: 'cashback',
    art: 'coins',
    tone: 'accent',
    badge: 'Daily Betting',
    title: 'CASH',
    titleHl: 'BACK',
    sub: 'Up to 5% back on every bet, every day.',
    cta: 'Claim it now',
  },
  {
    key: 'welcome',
    art: 'gift',
    tone: 'brand',
    badge: 'New Player',
    title: 'BONUS',
    titleHl: '৳500',
    sub: 'Register today and start with a boost.',
    cta: 'Get bonus',
  },
  {
    key: 'aviator',
    art: 'airplane-tilt',
    tone: 'highlight',
    badge: 'Originals',
    title: 'FLY &',
    titleHl: 'WIN',
    sub: 'Cash out before the plane flies away.',
    cta: 'Play now',
    to: '/aviator',
  },
];
const SLIDE_MS = 5000;

/* Category chips, in order. 'lobby' = every section as a scrolling row;
   any other key shows that category as a full grid. Keys are the
   `?tab=` URL values. */
const TABS = [
  { key: 'lobby', label: 'Lobby', icon: 'squares-four' },
  { key: 'popular', label: 'Popular', icon: 'fire' },
  { key: 'originals', label: 'Originals', icon: 'airplane-tilt' },
  { key: 'live', label: 'Live Casino', icon: 'broadcast' },
  { key: 'slot', label: 'Slots', icon: 'cherries' },
  { key: 'table', label: 'Table & Card', icon: 'cards' },
];
const TAB_KEYS = new Set(TABS.map((t) => t.key));

/* `icon` = Phosphor fill icon name (poster illustration).
   `art` = poster palette (GAME ARTWORK block in tokens.css).
   `players` = placeholder live count until the API provides real numbers.
   Every category keeps at least 4 games so a lobby row is never short. */
const GAMES = [
  // Originals
  { key: 'aviator', name: 'Aviator', provider: 'Originals', icon: 'airplane-tilt', art: 'crimson', cat: 'originals', badge: 'hot', popular: true, players: 3355, to: '/aviator' },
  { key: 'ludo', name: 'Ludo', provider: 'Originals', icon: 'dice-five', art: 'ocean', cat: 'originals', badge: 'new', popular: true, players: 812 },
  { key: 'mines', name: 'Mines', provider: 'Originals', icon: 'bomb', art: 'violet', cat: 'originals', popular: true, players: 1204 },
  { key: 'coin-flip', name: 'Coin Flip', provider: 'Originals', icon: 'coin', art: 'gold', cat: 'originals', players: 640 },
  { key: 'rocket', name: 'Rocket', provider: 'Originals', icon: 'rocket-launch', art: 'teal', cat: 'originals', badge: 'new', players: 958 },
  { key: 'balloon', name: 'Balloon', provider: 'Originals', icon: 'balloon', art: 'magenta', cat: 'originals', players: 377 },
  // Live casino
  { key: 'blackjack', name: 'Blackjack', provider: 'Evolution', icon: 'cards', art: 'night', cat: 'live', badge: 'live', popular: true, players: 2210 },
  { key: 'baccarat', name: 'Baccarat', provider: 'Evolution', icon: 'crown', art: 'forest', cat: 'live', badge: 'live', players: 1876 },
  { key: 'roulette', name: 'Roulette', provider: 'Evolution', icon: 'poker-chip', art: 'ember', cat: 'live', players: 1432 },
  { key: 'teenpatti', name: 'Teen Patti', provider: 'Ezugi', icon: 'cards-three', art: 'violet', cat: 'live', badge: 'hot', popular: true, players: 2954 },
  { key: 'dragon-tiger', name: 'Dragon Tiger', provider: 'Ezugi', icon: 'sword', art: 'crimson', cat: 'live', popular: true, players: 1120 },
  { key: 'lucky-7', name: 'Lucky 7', provider: 'Ezugi', icon: 'number-circle-seven', art: 'ocean', cat: 'live', players: 980 },
  // Slots
  { key: 'fruit-frenzy', name: 'Fruit Frenzy', provider: 'PG Soft', icon: 'orange-slice', art: 'magenta', cat: 'slot', players: 742 },
  { key: 'gem-strike', name: 'Gem Strike', provider: 'PG Soft', icon: 'diamonds-four', art: 'teal', cat: 'slot', badge: 'new', popular: true, players: 1563 },
  { key: 'mega-wheel', name: 'Mega Wheel', provider: 'Pragmatic', icon: 'fan', art: 'gold', cat: 'slot', popular: true, players: 1301 },
  { key: 'wild-west', name: 'Wild West', provider: 'Pragmatic', icon: 'horse', art: 'ember', cat: 'slot', players: 529 },
  { key: 'lucky-cherry', name: 'Lucky Cherry', provider: 'PG Soft', icon: 'cherries', art: 'night', cat: 'slot', players: 688 },
  { key: 'jungle-king', name: 'Jungle King', provider: 'Pragmatic', icon: 'paw-print', art: 'forest', cat: 'slot', players: 455 },
  // Table & card
  { key: 'poker', name: 'Poker', provider: 'Evolution', icon: 'spade', art: 'crimson', cat: 'table', players: 870 },
  { key: 'rummy', name: 'Rummy', provider: 'Ezugi', icon: 'club', art: 'teal', cat: 'table', players: 512 },
  { key: 'callbreak', name: 'Callbreak', provider: 'Ezugi', icon: 'heart', art: 'ocean', cat: 'table', players: 615 },
  { key: 'andar-bahar', name: 'Andar Bahar', provider: 'Ezugi', icon: 'diamond', art: 'violet', cat: 'table', badge: 'hot', players: 1048 },
  { key: 'carrom', name: 'Carrom', provider: 'Originals', icon: 'target', art: 'gold', cat: 'table', players: 333 },
  { key: 'bingo', name: 'Bingo', provider: 'Originals', icon: 'grid-nine', art: 'forest', cat: 'table', players: 291 },
];

function gamesFor(tabKey) {
  return tabKey === 'popular' ? GAMES.filter((g) => g.popular) : GAMES.filter((g) => g.cat === tabKey);
}

/* Placeholder until GET /game/rounds drives this. */
const LEADERS = [
  { key: 1, name: 'Rakib***', game: 'Aviator', amount: '৳12,480' },
  { key: 2, name: 'Sumi***', game: 'Mega Wheel', amount: '৳8,120' },
  { key: 3, name: 'Tanvir***', game: 'Aviator', amount: '৳6,905' },
];

const NOTICE = 'Withdrawals are processed within 3 × 24 hours. Contact support if delayed.';

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia?.(query).matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/**
 * Promo carousel. Auto-advances every 5s, but pauses while hovered or
 * while focus is inside it, can be paused with a button, and never
 * auto-advances under prefers-reduced-motion.
 */
function PromoBanner({ onOpen }) {
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const rotating = !userPaused && !hovered && !focused && !reducedMotion;

  useEffect(() => {
    if (!rotating) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [rotating]);

  return (
    <section className="h-banner" aria-roledescription="carousel" aria-label="Promotions">
      <div
        className="h-slider"
        aria-live={rotating ? 'off' : 'polite'}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
        }}
      >
        {SLIDES.map((slide, i) => {
          const active = i === index;
          return (
            <div
              key={slide.key}
              className={`h-slide${active ? ' on' : ''}`}
              data-tone={slide.tone}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${SLIDES.length}`}
              aria-hidden={!active}
              inert={!active}
            >
              <span className="h-slide-art" aria-hidden="true">
                <Icon name={slide.art} weight="fill" size={96} />
              </span>
              <div className="h-slide-copy">
                <span className="h-badge">{slide.badge}</span>
                <p className="h-slide-title">
                  {slide.title} <span className="hl">{slide.titleHl}</span>
                </p>
                <p className="h-slide-sub">{slide.sub}</p>
                <button type="button" className="h-slide-btn" onClick={() => onOpen(slide.to)}>
                  {slide.cta}
                  <Icon name="caret-right" size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="h-banner-controls">
        <div className="h-dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              className={`h-dot${i === index ? ' on' : ''}`}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
        {!reducedMotion && (
          <button
            type="button"
            className="h-pause"
            aria-label="Pause slideshow"
            aria-pressed={userPaused}
            onClick={() => setUserPaused((p) => !p)}
          >
            <Icon name={userPaused ? 'play' : 'pause'} size={20} />
          </button>
        )}
      </div>
    </section>
  );
}

export function Home() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  /* Lobby state lives in the URL so Back and deep links work:
     ?tab=<key> (pushes history) and ?q=<text> (first keystroke pushes,
     later ones replace — no history spam). */
  const rawTab = params.get('tab');
  const tab = rawTab && TAB_KEYS.has(rawTab) ? rawTab : 'lobby';
  const query = params.get('q') ?? '';

  const open = (to) => {
    if (to) navigate(to);
  };

  const openGame = (game) => open(game.to);

  const selectTab = (key) => {
    setParams(key === 'lobby' ? {} : { tab: key });
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  const setQuery = (value) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: Boolean(query) },
    );
  };

  const q = query.trim().toLowerCase();
  const results = q
    ? GAMES.filter((g) => g.name.toLowerCase().includes(q) || g.provider.toLowerCase().includes(q))
    : null;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="h-page">
      <SearchBar value={query} onChange={setQuery} />
      <CategoryChips tabs={TABS} active={results ? null : tab} onSelect={selectTab} />

      {results ? (
        /* ── Search results ── */
        <section className="g-section" aria-label="Search results">
          <div className="g-sec-hd">
            <h2 className="g-sec-title">
              {results.length ? `Results for “${query.trim()}”` : `No games match “${query.trim()}”`}
              <span className="g-sec-count">{results.length}</span>
            </h2>
          </div>
          <GameGrid
            games={results}
            onOpen={openGame}
            action={{ label: 'Browse all', sub: 'Back to lobby', onClick: () => selectTab('lobby') }}
          />
        </section>
      ) : tab === 'lobby' ? (
        <>
          <PromoBanner onOpen={open} />

          {/* ── Notice bar ── */}
          <div className="h-notice">
            <span className="h-notice-ico">
              <Icon name="bell" size={20} />
            </span>
            <span className="h-notice-text" title={NOTICE}>
              {NOTICE}
            </span>
            <button className="h-notice-btn" type="button">
              Detail
            </button>
          </div>

          {/* ── One scrolling row per category ── */}
          {TABS.filter((t) => t.key !== 'lobby').map((t) => (
            <GameSection
              key={t.key}
              icon={t.icon}
              title={t.label}
              games={gamesFor(t.key)}
              onOpen={openGame}
              onAll={() => selectTab(t.key)}
            />
          ))}

          {/* ── Leaderboard ── */}
          <div className="h-sec-hd">
            <h2 className="h-sec-title">Top Winners</h2>
            <button className="h-see-all" type="button">
              See all
              <Icon name="caret-right" size={16} />
            </button>
          </div>

          <div className="h-lb">
            <div className="h-lb-hd">
              <span className="h-lb-pulse" aria-hidden="true" />
              Live today
            </div>
            {LEADERS.map((leader, i) => (
              <div className={`h-lb-row${i === 0 ? ' top1' : ''}`} key={leader.key}>
                <div className="h-lb-rank">
                  {i === 0 ? <Icon name="trophy" weight="fill" size={20} label="Rank 1" /> : `#${i + 1}`}
                </div>
                <div className="h-lb-avatar" aria-hidden="true">
                  {leader.name.charAt(0)}
                </div>
                <div className="h-lb-info">
                  <div className="h-lb-name">{leader.name}</div>
                  <div className="h-lb-game">{leader.game}</div>
                </div>
                <div className="h-lb-amt">{leader.amount}</div>
              </div>
            ))}
          </div>

          {/* ── Provider ── */}
          <div className="h-sec-hd">
            <h2 className="h-sec-title">Casino</h2>
          </div>

          <div className="h-provider">
            <span className="h-provider-icon">
              <Icon name="broadcast" weight="fill" size={24} />
            </span>
            <div className="h-provider-text">
              <div className="h-provider-name">Evo Casino</div>
              <div className="h-provider-sub">Live dealer tables</div>
            </div>
            <button className="h-provider-btn" type="button">
              <Icon name="plus" size={16} />
              Desktop
            </button>
          </div>
        </>
      ) : (
        /* ── One category as a full grid, ending in Load more ── */
        <section className="g-section" aria-label={activeTab.label}>
          <div className="g-sec-hd">
            <h2 className="g-sec-title">
              <span className="g-sec-icon">
                <Icon name={activeTab.icon} weight="fill" size={24} />
              </span>
              {activeTab.label}
              <span className="g-sec-count">{gamesFor(tab).length}</span>
            </h2>
          </div>
          {/* Load more is presentational for now — no paging API yet. */}
          <GameGrid games={gamesFor(tab)} onOpen={openGame} />
        </section>
      )}
    </div>
  );
}
