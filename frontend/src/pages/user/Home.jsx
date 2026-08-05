import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SLIDES = [
  {
    key: 'cashback',
    className: 'u-banner',
    mascot: '🧙',
    eyebrow: 'Daily',
    badge: 'Betting',
    title: 'CASH BACK',
    cta: 'Claim it now',
  },
  {
    key: 'welcome',
    className: 'u-banner',
    mascot: '🎁',
    eyebrow: 'New Player',
    badge: 'Welcome',
    title: 'BONUS 500৳',
    cta: 'Get bonus',
  },
  {
    key: 'aviator',
    className: 'u-banner',
    mascot: '✈️',
    eyebrow: 'Play Now',
    badge: 'Aviator',
    title: 'FLY & WIN',
    cta: 'Play now',
  },
];

const CATEGORIES = [
  {
    key: 'originals',
    label: 'Originals',
    tiles: [{ key: 'aviator', label: 'Aviator', icon: '✈️', className: 'blue', to: '/aviator' }],
  },
  {
    key: 'live-casino',
    label: 'Live Casino',
    tiles: [
      { key: 'blackjack', label: 'Blackjack', icon: '🃏', className: 'blue' },
      { key: 'baccarat', label: 'Baccarat', icon: '🎴', className: 'purple' },
      { key: 'roulette', label: 'Roulette', icon: '🎡', className: 'teal' },
      { key: 'teenpatti', label: 'Teen Patti', icon: '🀄', className: 'blue' },
    ],
  },
  {
    key: 'slot',
    label: 'Slot',
    tiles: [
      { key: 'fruit-frenzy', label: 'Fruit Frenzy', icon: '🍭', className: 'purple' },
      { key: 'gem-strike', label: 'Gem Strike', icon: '💎', className: 'teal' },
      { key: 'mega-wheel', label: 'Mega Wheel', icon: '🎰', className: 'blue' },
      { key: 'wild-west', label: 'Wild West', icon: '🤠', className: 'purple' },
    ],
  },
  {
    key: 'table-card',
    label: 'Table & Card',
    tiles: [
      { key: 'poker', label: 'Poker', icon: '♠️', className: 'blue' },
      { key: 'rummy', label: 'Rummy', icon: '🂡', className: 'teal' },
      { key: 'dominoes', label: 'Dominoes', icon: '🁠', className: 'purple' },
      { key: 'ludo', label: 'Ludo', icon: '🎲', className: 'blue' },
    ],
  },
];

export function Home() {
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlideIndex((i) => (i + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="u-slider">
        <div
          className="u-slider-track"
          style={{ transform: `translateX(-${slideIndex * 100}%)` }}
        >
          {SLIDES.map((slide) => (
            <div className={`u-slider-slide ${slide.className}`} key={slide.key} style={{ margin: 0 }}>
              <span className="u-banner-mascot">{slide.mascot}</span>
              <div className="u-banner-copy">
                <div className="u-banner-eyebrow">{slide.eyebrow}</div>
                <div className="u-banner-badge">{slide.badge}</div>
                <div className="u-banner-title">{slide.title}</div>
                <button className="u-banner-cta" type="button">
                  ➜ {slide.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="u-slider-dots">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              className={`u-slider-dot${i === slideIndex ? ' active' : ''}`}
              onClick={() => setSlideIndex(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="u-ticker">
        <span className="u-ticker-icon">🔊</span>
        <span className="u-ticker-text">
          The time for receiving money for withdrawal is 3 x 24 hours. If after 72 hours you
          haven't received it, please contact support.
        </span>
        <button className="u-ticker-btn" type="button">
          💧 Detail
        </button>
      </div>

      {CATEGORIES.map((category) => (
        <div className="u-category-section" key={category.key}>
          <h2 className="u-section-title">{category.label}</h2>
          <div className="u-category-row">
            {category.tiles.map((tile) => (
              <button
                key={tile.key}
                type="button"
                className={`u-game-tile ${tile.className}`}
                onClick={tile.to ? () => navigate(tile.to) : undefined}
              >
                <span className="u-game-tile-icon">{tile.icon}</span>
                {tile.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      <h2 className="u-section-title">Casino</h2>
      <div className="u-provider-card">
        <span className="u-provider-icon">🎴</span>
        <div style={{ flex: 1 }}>
          <div className="u-provider-name">Evo Casino</div>
          <div className="u-provider-sub">Live dealer tables</div>
        </div>
        <button className="u-provider-btn" type="button">
          + Add to Desktop
        </button>
      </div>
    </div>
  );
}
