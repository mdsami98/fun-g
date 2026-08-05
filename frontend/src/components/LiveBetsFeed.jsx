import { useState } from 'react';

const TABS = [
  { key: 'all', label: 'All Bets' },
  { key: 'previous', label: 'Previous' },
  { key: 'top', label: 'Top' },
];

const TOP_SORTS = [
  { key: 'x', label: 'X' },
  { key: 'win', label: 'Win' },
];

export function LiveBetsFeed({ allBets, previousBets, previousCrashPoint, topBets, stats }) {
  const [activeTab, setActiveTab] = useState('all');
  const [topSort, setTopSort] = useState('win');

  const progressPct = stats.totalCount ? (stats.revealedCount / stats.totalCount) * 100 : 0;

  const sortedTopBets = [...topBets].sort((a, b) =>
    topSort === 'x'
      ? Number(b.cashOutMultiplier) - Number(a.cashOutMultiplier)
      : Number(b.payout) - Number(a.payout),
  );

  const rows = activeTab === 'all' ? allBets : activeTab === 'previous' ? previousBets : sortedTopBets;

  return (
    <div className="aviator-feed-card">
      <div className="aviator-feed-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`aviator-feed-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'previous' ? (
        <div className="aviator-feed-round-result">
          <div className="aviator-feed-summary-label">Round Result</div>
          <div className="aviator-feed-round-result-value">
            {previousCrashPoint ? `${previousCrashPoint}x` : '—'}
          </div>
        </div>
      ) : activeTab === 'top' ? (
        <div className="aviator-feed-sort-row">
          {TOP_SORTS.map((sort) => (
            <button
              key={sort.key}
              type="button"
              className={`aviator-feed-sort-btn${topSort === sort.key ? ' active' : ''}`}
              onClick={() => setTopSort(sort.key)}
            >
              {sort.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="aviator-feed-summary">
          <div className="aviator-feed-summary-progress">
            <div className="aviator-feed-progress-track">
              <div className="aviator-feed-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="aviator-feed-summary-label">
              {stats.revealedCount}/{stats.totalCount} Bets
            </div>
          </div>
          <div className="aviator-feed-summary-total">
            <div className="aviator-feed-summary-total-value">৳{stats.totalWin}</div>
            <div className="aviator-feed-summary-label">Total win</div>
          </div>
        </div>
      )}

      {activeTab === 'top' ? (
        <div className="aviator-feed-card-list">
          {rows.length === 0 ? (
            <div className="aviator-feed-empty">No top wins yet this session — keep watching!</div>
          ) : (
            rows.map((bet) => (
              <div key={bet.id} className={`aviator-feed-win-card${bet.isYou ? ' you' : ''}`}>
                <div className="aviator-feed-win-card-player">
                  <span className="aviator-feed-avatar">{bet.avatar}</span>
                  {bet.handle}
                </div>
                <div className="aviator-feed-win-card-row">
                  <span>
                    Bet ৳<strong>{bet.amount}</strong>
                  </span>
                  <span>
                    Result <strong className="aviator-feed-pink">{bet.cashOutMultiplier}x</strong>
                  </span>
                </div>
                <div className="aviator-feed-win-card-row">
                  <span>
                    Win ৳<strong>{bet.payout}</strong>
                  </span>
                  <span>
                    Round max <strong className="aviator-feed-pink">{bet.roundMax}x</strong>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="aviator-feed-header-row">
            <span>Player</span>
            <span>Bet ৳</span>
            <span>X</span>
            <span>Win ৳</span>
          </div>

          <div className="aviator-feed-list">
            {rows.length === 0 ? (
              <div className="aviator-feed-empty">No bets to show</div>
            ) : (
              rows.map((bet) => (
                <div
                  key={bet.id}
                  className={`aviator-feed-row${bet.cashOutMultiplier !== null ? ' win' : ''}${bet.isYou ? ' you' : ''}`}
                >
                  <span className="aviator-feed-player">
                    <span className="aviator-feed-avatar">{bet.avatar}</span>
                    {bet.handle}
                  </span>
                  <span className="aviator-feed-bet">৳{bet.amount}</span>
                  <span className="aviator-feed-x">
                    {bet.cashOutMultiplier ? `${bet.cashOutMultiplier}x` : '—'}
                  </span>
                  <span className="aviator-feed-win">{bet.payout ? `৳${bet.payout}` : '—'}</span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
