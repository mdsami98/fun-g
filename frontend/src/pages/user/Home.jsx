import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GAMES, HOME_CATEGORIES, PROVIDERS } from '../../data/games';
import { LobbyBannerSlider } from '../../components/LobbyBannerSlider';
import { MarqueeNotice } from '../../components/MarqueeNotice';
import { SuperWinJackpot } from '../../components/SuperWinJackpot';
import { GameCard } from '../../components/GameCard';
import { Icon } from '../../components/Icon';
import '../../styles/home.css';

export function Home() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('popular');
  const [comingSoonGame, setComingSoonGame] = useState(null);

  // Filter games based on selected category
  const displayedGames = useMemo(() => {
    if (activeCategory === 'popular') {
      return GAMES.filter((g) => g.popular);
    }
    return GAMES.filter((g) => g.cat === activeCategory);
  }, [activeCategory]);

  const handleOpenGame = (game) => {
    if (game.to) {
      navigate(game.to);
    } else {
      setComingSoonGame(game);
    }
  };

  const activeCategoryMeta = HOME_CATEGORIES.find((c) => c.key === activeCategory) || HOME_CATEGORIES[0];

  return (
    <div className="home-casino-layout">
      {/* 1. Hero Promo Carousel */}
      <LobbyBannerSlider />

      {/* 2. Scrolling Marquee Notice */}
      <MarqueeNotice />

      {/* 3. Super Win Jackpot Counter */}
      <SuperWinJackpot />

      {/* 4. Dual Quick Actions (Deposit / Withdraw) */}
      <div className="lobby-quick-actions-grid">
        <button
          type="button"
          className="quick-action-btn deposit"
          onClick={() => navigate('/wallet')}
        >
          <span className="quick-action-icon">💼</span>
          <span className="quick-action-label">ডিপোজিট</span>
        </button>
        <button
          type="button"
          className="quick-action-btn withdraw"
          onClick={() => navigate('/wallet')}
        >
          <span className="quick-action-icon">🏧</span>
          <span className="quick-action-label">উত্তোলন</span>
        </button>
      </div>

      {/* 5. Category Navigation Bar (Matching Screenshot: জনপ্রিয়, স্লট, লাইভ, ক্র্যাশ, স্পোর্টস) */}
      <div className="lobby-category-navbar">
        {HOME_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              className={`lobby-cat-btn${isActive ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.key)}
            >
              <span className="lobby-cat-icon">
                <Icon name={cat.icon} weight="fill" size={24} />
              </span>
              <span className="lobby-cat-label">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 6. Section Header (Green Pill + See More) */}
      <div className="lobby-section-header">
        <div className="lobby-section-pill">
          <span className="pill-dot" />
          <span className="pill-text">
            {activeCategory === 'popular' ? '🔥 জনপ্রিয় গেমস' : `${activeCategoryMeta.label} গেমস`}
          </span>
        </div>
        <button
          type="button"
          className="lobby-see-more-btn"
          onClick={() => navigate(`/games?category=${activeCategory}`)}
        >
          <span>আরো দেখুন</span>
          <span className="see-more-arrow">›</span>
        </button>
      </div>

      {/* 7. 3-Column Game Poster Grid */}
      <div className="lobby-games-grid">
        {displayedGames.map((game) => (
          <GameCard key={game.key} game={game} onOpen={handleOpenGame} />
        ))}
      </div>

      {/* 8. Provider Showcase Row */}
      <div className="lobby-providers-section">
        <div className="providers-title">গেম পার্টনার ও প্রোভাইডার্স</div>
        <div className="providers-list-scroll">
          {PROVIDERS.map((prov) => (
            <div
              key={prov.name}
              className="provider-badge-card"
              onClick={() => navigate(`/games?q=${encodeURIComponent(prov.name)}`)}
            >
              <span className="provider-logo-text">{prov.logoText}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Coming Soon Notice Modal */}
      {comingSoonGame && (
        <div className="cs-modal-overlay" onClick={() => setComingSoonGame(null)}>
          <div
            className="cs-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="cs-modal-close"
              onClick={() => setComingSoonGame(null)}
              aria-label="Close"
            >
              ✕
            </button>

            <div className="cs-modal-poster-wrap">
              <span className="cs-modal-icon" aria-hidden="true">
                <Icon name={comingSoonGame.icon} weight="fill" size={60} />
              </span>
            </div>

            <h3 className="cs-modal-title">{comingSoonGame.name}</h3>
            <span className="cs-modal-provider">{comingSoonGame.provider}</span>

            <p className="cs-modal-text">
              {comingSoonGame.description || 'এই গেমটি খুব শীঘ্রই প্ল্যাটফর্মে লাইভ হবে!'}
            </p>

            <div className="cs-modal-notice">
              <span className="cs-modal-pulse" />
              <span>বর্তমানে <strong>Aviator</strong> সম্পূর্ণ সক্রিয় ও লাইভ চলছে!</span>
            </div>

            <div className="cs-modal-actions">
              <button
                type="button"
                className="cs-modal-btn-primary"
                onClick={() => {
                  setComingSoonGame(null);
                  navigate('/aviator');
                }}
              >
                <Icon name="airplane-tilt" weight="fill" size={20} />
                এখনই Aviator খেলুন
              </button>
              <button
                type="button"
                className="cs-modal-btn-secondary"
                onClick={() => setComingSoonGame(null)}
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
