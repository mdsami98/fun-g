import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../api/client';

const PAGE_SIZE = 20;

const STATUS_META = {
  cashed_out: { pill: 'win', label: 'Won' },
  lost: { pill: 'lose', label: 'Lost' },
  pending: { pill: 'pending', label: 'Pending' },
};

function formatDate(iso) {
  const date = new Date(iso);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function ResultText({ bet }) {
  if (bet.status === 'cashed_out') {
    return (
      <span className="u-activity-result win">
        +৳{bet.payout} at {bet.cashOutMultiplier}x
      </span>
    );
  }
  if (bet.status === 'lost') {
    return <span className="u-activity-result lose">-৳{bet.amount}</span>;
  }
  return <span className="u-activity-result pending">Pending</span>;
}

export function Activity() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');

    api
      .getMyBetHistory(accessToken, { page: 1, limit: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items);
        setTotal(data.total);
        setPage(1);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'Failed to load activity');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    setError('');
    try {
      const nextPage = page + 1;
      const data = await api.getMyBetHistory(accessToken, { page: nextPage, limit: PAGE_SIZE });
      setItems((prev) => [...prev, ...data.items]);
      setTotal(data.total);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load more activity');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <div>
      <h1 className="u-page-title">Activity</h1>

      {error && <div className="u-list-error">{error}</div>}

      {isLoading ? (
        <div className="u-card u-empty-state">Loading…</div>
      ) : items.length === 0 ? (
        <div className="u-card u-empty-state">
          <div className="u-empty-state-icon">🧾</div>
          No activity yet.
          <br />
          <Link to="/aviator">Play Aviator</Link> to see your history here.
        </div>
      ) : (
        <>
          <div className="u-card">
            {items.map((bet) => {
              const meta = STATUS_META[bet.status] ?? STATUS_META.pending;
              return (
                <div className="u-activity-row" key={bet.id}>
                  <div className="u-activity-row-top">
                    <span className="u-activity-date">{formatDate(bet.placedAt)}</span>
                    <span className={`u-status-pill ${meta.pill}`}>{meta.label}</span>
                  </div>
                  <div className="u-activity-row-bottom">
                    <span className="u-activity-amount">Bet ৳{bet.amount}</span>
                    <ResultText bet={bet} />
                  </div>
                </div>
              );
            })}
          </div>

          {items.length < total && (
            <button className="u-load-more-btn" type="button" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
