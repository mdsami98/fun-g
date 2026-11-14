import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GAMES, TABS } from '../../data/games';
import { GameCard } from '../../components/GameCard';
import { SearchBar, CategoryChips } from '../../components/LobbyControls';
import { Icon } from '../../components/Icon';
import '../../styles/games.css';
import '../../styles/allGames.css';

export function GamesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeCategory = searchParams.get('category') || 'all';
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [comingSoonGame, setComingSoonGame] = useState(null);

  // Extract unique providers for quick provider filtering
  const providers = useMemo(() => {
    const set = new Set(GAMES.map((g) => g.provider));
    return ['all', ...Array.from(set)];
  }, []);

  const handleCategorySelect = (key) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (key === 'all') next.delete('category');
      else next.set('category', key);
      return next;
    });
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value.trim()) next.set('q', value);
        else next.delete('q');
        return next;
      },
      { replace: Boolean(searchQuery) },
    );
  };

  const handleClearAll = () => {
    setSearchQuery('');
    setSelectedProvider('all');
    setSearchParams({});
  };

  const handleOpenGame = (game) => {
    if (game.to) {
      navigate(game.to);
    } else {
      setComingSoonGame(game);
    }
  };

  // Filter games based on search, category, and provider
  const filteredGames = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return GAMES.filter((game) => {
      // Category filter
      if (activeCategory === 'popular' && !game.popular) return false;
      if (activeCategory !== 'all' && activeCategory !== 'popular' && game.cat !== activeCategory) {
        return false;
      }

      // Provider filter
      if (selectedProvider !== 'all' && game.provider !== selectedProvider) {
        return false;
      }

      // Text query
      if (q) {
        const nameMatch = game.name.toLowerCase().includes(q);
        const providerMatch = game.provider.toLowerCase().includes(q);
        const catMatch = (game.cat || '').toLowerCase().includes(q);
        if (!nameMatch && !providerMatch && !catMatch) return false;
      }

      return true;
    });
  }, [searchQuery, activeCategory, selectedProvider]);

  return (
    <div className="all-games-container">
      {/* Page Header */}
      <div className="all-games-header">
        <div>
          <h1 className="all-games-title">
            <Icon name="game-controller" weight="fill" size={28} className="all-games-title-icon" />
            সকল গেমস (All Games)
          </h1>
          <p className="all-games-subtitle">
            আপনার পছন্দের গেম বেছে নিন এবং খেলা শুরু করুন
          </p>
        </div>
        <div className="all-games-stats-pill">
          <span className="stats-dot" />
          <span>{filteredGames.length} টি গেম উপলব্ধ</span>
        </div>
      </div>

      {/* Sticky Search Bar */}
      <div className="all-games-search-wrapper">
        <SearchBar value={searchQuery} onChange={handleSearchChange} />
      </div>

      {/* Category Chips */}
      <CategoryChips
        tabs={TABS}
        active={activeCategory}
        onSelect={handleCategorySelect}
      />

      {/* Provider Quick Filter Bar */}
      <div className="provider-filters-row">
        <span className="provider-filter-label">প্রোভাইডার:</span>
        <div className="provider-chips-scroll">
          {providers.map((p) => (
            <button
              key={p}
              type="button"
              className={`provider-chip${selectedProvider === p ? ' active' : ''}`}
              onClick={() => setSelectedProvider(p)}
            >
              {p === 'all' ? 'সকল' : p}
            </button>
          ))}
        </div>
      </div>

      {/* Games Grid or Empty State */}
      {filteredGames.length > 0 ? (
        <div className="all-games-grid">
          {filteredGames.map((game) => (
            <GameCard key={game.key} game={game} onOpen={handleOpenGame} />
          ))}
        </div>
      ) : (
        <div className="all-games-empty">
          <div className="empty-icon-circle">
            <Icon name="magnifying-glass" size={44} />
          </div>
          <h3 className="empty-title">কোনো গেম খুঁজে পাওয়া যায়নি</h3>
          <p className="empty-desc">
            {searchQuery
              ? `“${searchQuery}” দিয়ে কোনো গেম পাওয়া যায়নি। সঠিক বানান দিয়ে আবার খুঁজুন।`
              : 'নির্বাচিত ফিল্টারের সাথে কোনো গেম মিলেনি।'}
          </p>
          <button type="button" className="empty-reset-btn" onClick={handleClearAll}>
            সকল গেম দেখুন (Reset Filters)
          </button>
        </div>
      )}

      {/* Coming Soon Notice Modal for non-Aviator games */}
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
