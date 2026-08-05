import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useLiveBetsFeed } from '../../hooks/useLiveBetsFeed';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { LiveBetsFeed } from '../../components/LiveBetsFeed';
import '../../styles/userTheme.css';
import '../../styles/aviatorTheme.css';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

function historyPillClass(crashPoint) {
  const value = Number(crashPoint);
  if (value >= 2) return 'high';
  if (value < 1.5) return 'low';
  return '';
}

export function AviatorGame() {
  const { isAuthenticated, accessToken } = useAuth();
  const game = useGameSocket(isAuthenticated ? accessToken : undefined);
  const feed = useLiveBetsFeed(game);
  const [betAmount, setBetAmount] = useState(100);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, []);

  const countdownSeconds = useMemo(() => {
    if (game.phase !== 'betting' || !game.bettingClosesAt) return null;
    const remaining = Math.max(0, new Date(game.bettingClosesAt).getTime() - now);
    return Math.ceil(remaining / 1000);
  }, [game.phase, game.bettingClosesAt, now]);

  const potentialPayout = useMemo(() => {
    if (!game.myBet || game.myBet.status !== 'pending') return null;
    return (Number(game.myBet.amount) * Number(game.multiplier)).toFixed(2);
  }, [game.myBet, game.multiplier]);

  const statusLabel =
    game.phase === 'betting'
      ? `NEXT ROUND IN ${countdownSeconds ?? ''}s`
      : game.phase === 'running'
        ? 'FLYING'
        : game.phase === 'crashed'
          ? `CRASHED @ ${game.crashPoint}x`
          : 'CONNECTING…';

  const handlePrimaryAction = async () => {
    setError('');

    if (!isAuthenticated) {
      setShowAuthPrompt(true);
      return;
    }

    setIsSubmitting(true);
    try {
      if (game.myBet?.status === 'pending' && game.phase === 'running') {
        const ack = await game.cashOut();
        if (!ack.ok) setError(ack.reason);
      } else if (game.phase === 'betting' && !game.myBet) {
        const amount = Number(betAmount);
        if (!amount || amount <= 0) {
          setError('Enter a valid bet amount');
        } else {
          const ack = await game.placeBet(amount);
          if (!ack.ok) setError(ack.reason);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const canPlaceBet = isAuthenticated && game.phase === 'betting' && !game.myBet;
  const canCashOut =
    isAuthenticated && game.phase === 'running' && game.myBet?.status === 'pending';
  const buttonDisabled = isSubmitting || (isAuthenticated && !canPlaceBet && !canCashOut);

  let buttonLabel = 'PLACE BET';
  if (!isAuthenticated) buttonLabel = 'LOGIN TO PLAY';
  else if (canCashOut) buttonLabel = `CASH OUT ৳${potentialPayout}`;
  else if (game.myBet?.status === 'cashed_out') buttonLabel = 'CASHED OUT';
  else if (game.myBet?.status === 'lost') buttonLabel = 'LOST — WAIT FOR NEXT ROUND';
  else if (game.phase === 'running') buttonLabel = 'ROUND IN PROGRESS';

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <div className="aviator-page">
      <div className="aviator-header">
        <Link to="/" className="aviator-back-btn">
          ←
        </Link>
        <div className="aviator-title">✈️ AVIATOR</div>
        <div className="aviator-balance-badge">
          💰 {isAuthenticated ? `৳${game.balance ?? '—'}` : 'Guest'}
        </div>
      </div>

      <div className="aviator-body">
        {!isAuthenticated && (
          <div className="aviator-spectator-banner">
            You're watching live — log in to place a bet.
          </div>
        )}

        <div className="aviator-canvas">
          <div className="aviator-canvas-burst" />
          <div className={`aviator-status ${game.phase ?? ''}`}>{statusLabel}</div>
          <div className={`aviator-plane ${game.phase ?? ''}`}>
            <svg viewBox="0 0 160 48" className="aviator-plane-svg" xmlns="http://www.w3.org/2000/svg">
              <line x1="0" y1="40" x2="90" y2="24" className="aviator-plane-trail" />
              <polygon points="158,14 88,0 120,24 96,48" className="aviator-plane-body" />
            </svg>
          </div>
          <div className={`aviator-multiplier ${game.phase === 'crashed' ? 'crashed' : ''}`}>
            {game.phase === 'crashed' ? game.crashPoint : game.multiplier}x
          </div>
          <div className="aviator-watchers">
            <div className="aviator-watchers-avatars">
              {feed.allBets.slice(0, 3).map((b) => (
                <span key={b.id} className="aviator-watchers-avatar">
                  {b.avatar}
                </span>
              ))}
            </div>
            <span className="aviator-watchers-count">{feed.stats.totalCount}</span>
          </div>
        </div>

        {game.history.length > 0 && (
          <div className="aviator-history">
            {game.history.map((h) => (
              <span key={h.roundId} className={`aviator-history-pill ${historyPillClass(h.crashPoint)}`}>
                {h.crashPoint}x
              </span>
            ))}
          </div>
        )}

        <div className="aviator-betting-card">
          {error && <div className="aviator-error">{error}</div>}

          <div className="aviator-bet-label-row">
            <span>Bet Amount</span>
            {isAuthenticated && <span>Balance: ৳{game.balance ?? '—'}</span>}
          </div>
          <input
            type="number"
            className="aviator-bet-input"
            min="10"
            value={betAmount}
            onChange={(e) => setBetAmount(e.target.value)}
            disabled={!canPlaceBet}
          />

          <div className="aviator-quick-bet">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                type="button"
                className="aviator-quick-bet-btn"
                onClick={() => setBetAmount(amount)}
                disabled={!canPlaceBet}
              >
                ৳{amount}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`aviator-action-btn ${canCashOut ? 'cashout' : 'bet'}`}
            onClick={handlePrimaryAction}
            disabled={buttonDisabled}
          >
            {buttonLabel}
          </button>

          {game.myBet?.status === 'cashed_out' && (
            <div className="aviator-bet-status win">
              You won ৳{game.myBet.payout} at {game.myBet.cashOutMultiplier}x
            </div>
          )}
          {game.myBet?.status === 'lost' && (
            <div className="aviator-bet-status lose">You lost ৳{game.myBet.amount}</div>
          )}
        </div>

        <LiveBetsFeed {...feed} />
      </div>

      <AuthPromptModal open={showAuthPrompt} onClose={() => setShowAuthPrompt(false)} />
        </div>
      </div>
    </div>
  );
}
