import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGameSocket } from '../../hooks/useGameSocket';
import { useLiveBetsFeed } from '../../hooks/useLiveBetsFeed';
import { AuthPromptModal } from '../../components/AuthPromptModal';
import { LiveBetsFeed } from '../../components/LiveBetsFeed';
import { FlightPlane } from '../../components/FlightPlane';
import { Icon } from '../../components/Icon';
import { buildFlightPath } from './flightPath';
import '../../styles/userTheme.css';
import '../../styles/aviatorTheme.css';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

/* Plane length in px, proportional to the canvas width so it always fits
   ahead of the tip (which parks at ~82% across) on narrow phones. */
const PLANE_MIN = 46;
const PLANE_MAX = 78;
const PLANE_WIDTH_RATIO = 0.17;
/* The curve's tangent gets steep (50°+) at high multipliers; the plane
   reads better climbing at a capped pitch. */
const PLANE_MAX_TILT = 24;

/* The socket only sends bettingClosesAt, not the window length. Use the
   server default (GAME_BETTING_DURATION_MS) as a floor so a player who
   joins mid-countdown sees a part-drained bar, not a full one. */
const DEFAULT_BETTING_MS = 7000;

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

  /* Pre-round bar: sampled ONCE per round, then CSS drains it — no
     per-frame re-renders. `from` is the fill fraction at first sight. */
  const startBar = useMemo(() => {
    if (game.phase !== 'betting' || !game.bettingClosesAt) return null;
    const remaining = Math.max(0, new Date(game.bettingClosesAt).getTime() - Date.now());
    const total = Math.max(remaining, DEFAULT_BETTING_MS);
    return { remaining, total, from: total ? remaining / total : 0 };
  }, [game.phase, game.bettingClosesAt]);

  const potentialPayout = useMemo(() => {
    if (!game.myBet || game.myBet.status !== 'pending') return null;
    return (Number(game.myBet.amount) * Number(game.multiplier)).toFixed(2);
  }, [game.myBet, game.multiplier]);

  /* The canvas viewBox is stretched non-uniformly (preserveAspectRatio
     "none"), so an angle computed in path units would not match what the
     eye sees. Measure the box and convert the tangent to real pixels. */
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = canvasRef.current;
    if (!el) return undefined;
    const measure = () =>
      setCanvasSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* Dev-only: ?sim=3.5 freezes the curve at a chosen multiplier so the
     flight path can be reviewed without waiting for a live round.
     import.meta.env.DEV keeps this out of production builds entirely. */
  const simMultiplier = useMemo(() => {
    if (!import.meta.env.DEV) return null;
    const raw = new URLSearchParams(window.location.search).get('sim');
    const value = Number(raw);
    return raw !== null && Number.isFinite(value) && value >= 1 ? value : null;
  }, []);

  /* Which visual state the canvas paints — simulated when previewing. */
  const renderPhase = simMultiplier !== null ? 'running' : (game.phase ?? '');

  /* The multiplier the curve is drawn at. On crash it freezes at the
     crash point rather than snapping back to the origin. */
  const drawnMultiplier = useMemo(() => {
    if (simMultiplier !== null) return simMultiplier;
    if (game.phase === 'betting' || !game.phase) return 1;
    return game.phase === 'crashed' ? game.crashPoint : game.multiplier;
  }, [simMultiplier, game.phase, game.multiplier, game.crashPoint]);

  /* Ribbon + arrowhead, built in pixel space from the measured canvas so
     the taper stays true and the arrow always rides the tangent. */
  const path = useMemo(
    () => buildFlightPath(drawnMultiplier, canvasSize.w, canvasSize.h),
    [drawnMultiplier, canvasSize],
  );

  /* Plane placement: tail-bottom on the tip, nose along the tangent. */
  const planeTransform = useMemo(() => {
    if (!path) return '';
    const size = Math.min(PLANE_MAX, Math.max(PLANE_MIN, canvasSize.w * PLANE_WIDTH_RATIO));
    const tilt = Math.min(path.angle, PLANE_MAX_TILT);
    return `translate(${path.tip.x.toFixed(2)} ${path.tip.y.toFixed(2)}) rotate(${(-tilt).toFixed(2)}) scale(${(size / 100).toFixed(3)})`;
  }, [path, canvasSize.w]);

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
  if (isSubmitting) buttonLabel = 'PLEASE WAIT…';
  else if (!isAuthenticated) buttonLabel = 'LOGIN TO PLAY';
  else if (canCashOut) buttonLabel = `CASH OUT ৳${potentialPayout}`;
  else if (game.myBet?.status === 'cashed_out') buttonLabel = 'CASHED OUT';
  else if (game.myBet?.status === 'lost') buttonLabel = 'LOST — WAIT FOR NEXT ROUND';
  else if (game.phase === 'running') buttonLabel = 'ROUND IN PROGRESS';

  return (
    <div className="user-shell">
      <div className="user-shell-inner">
        <div className="aviator-page">
      <div className="aviator-header">
        <Link to="/" className="aviator-back-btn" aria-label="Back to lobby">
          <Icon name="arrow-left" size={22} />
        </Link>
        <h1 className="aviator-title">
          <Icon name="airplane-tilt" weight="fill" size={22} />
          AVIATOR
        </h1>
        <div className="aviator-balance-badge">
          <Icon name="coins" size={18} />
          {isAuthenticated ? `৳${game.balance ?? '—'}` : 'Guest'}
        </div>
      </div>

      <div className="aviator-body">
        {!isAuthenticated && (
          <div className="aviator-spectator-banner">
            <Icon name="info" size={20} />
            You're watching live — log in to place a bet.
          </div>
        )}

        <div className={`aviator-canvas ${renderPhase}`} ref={canvasRef}>
          <div className="aviator-canvas-burst" />
          {renderPhase !== 'betting' && (
            <div className={`aviator-status ${game.phase ?? ''}`}>{statusLabel}</div>
          )}

          {renderPhase === 'betting' && (
            <div className="aviator-start" aria-live="polite">
              <div className="aviator-start-lockup">
                <svg className="aviator-start-mark" viewBox="-6 -52 118 72" aria-hidden="true">
                  <g transform="rotate(-14 50 -10)">
                    <FlightPlane />
                  </g>
                </svg>
                <span className="aviator-start-divider" aria-hidden="true" />
                <span className="aviator-start-title">AVIATOR</span>
              </div>
              <div className="aviator-start-sub">PLACE YOUR BETS</div>

              <div
                className="aviator-start-bar"
                role="progressbar"
                aria-label="Time until takeoff"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  startBar ? Math.round(Math.min(1, ((countdownSeconds ?? 0) * 1000) / startBar.total) * 100) : 0
                }
              >
                {startBar && (
                  <div
                    key={game.roundId}
                    className="aviator-start-bar-fill"
                    style={{ '--from': startBar.from, animationDuration: `${startBar.remaining}ms` }}
                  />
                )}
              </div>
              <div className="aviator-start-count">
                Takeoff in <strong>{countdownSeconds ?? '–'}s</strong>
              </div>

              <div className="aviator-start-badge">
                <span className="aviator-start-badge-main">
                  <span className="aviator-start-check" aria-hidden="true">
                    <Icon name="check" size={12} />
                  </span>
                  Original game
                </span>
                <span className="aviator-start-badge-sub">Cash out before it flies away</span>
              </div>
            </div>
          )}

          {/* Flight path — area, ribbon and plane in ONE svg, drawn in pixel
              space (no preserveAspectRatio stretch). The plane is placed from
              the same tip + tangent as the ribbon, so it stays welded to the
              end of the trail by construction. */}
          {path && (
            <svg
              className={`aviator-path ${renderPhase}`}
              viewBox={`0 0 ${canvasSize.w} ${canvasSize.h}`}
              width={canvasSize.w}
              height={canvasSize.h}
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              {/* Flat: area and line are one solid colour (--path-color in
                  aviatorTheme.css), the area at a single fixed opacity. */}
              <path className="aviator-path-area" d={path.areaD} />
              <path className="aviator-path-ribbon" d={path.ribbonD} />
              <g transform={planeTransform}>
                <FlightPlane />
              </g>
            </svg>
          )}

          {renderPhase !== 'betting' && (
            <div className={`aviator-multiplier ${game.phase === 'crashed' ? 'crashed' : ''}`}>
              {game.phase === 'crashed' ? game.crashPoint : game.multiplier}x
            </div>
          )}
          <div className="aviator-watchers">
            <div className="aviator-watchers-avatars" aria-hidden="true">
              {feed.allBets.slice(0, 3).map((b) => (
                <span key={b.id} className="aviator-watchers-avatar">
                  {b.handle.charAt(0).toUpperCase()}
                </span>
              ))}
            </div>
            <span className="aviator-watchers-count" aria-label={`${feed.stats.totalCount} players`}>
              <Icon name="users" size={14} />
              {feed.stats.totalCount}
            </span>
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
          {error && (
            <div className="aviator-error" role="alert">
              <Icon name="warning-circle" size={18} />
              {error}
            </div>
          )}

          <div className="aviator-bet-label-row">
            <label htmlFor="aviator-bet-amount">Bet amount</label>
            {isAuthenticated && <span>Balance: ৳{game.balance ?? '—'}</span>}
          </div>
          <input
            id="aviator-bet-amount"
            type="number"
            inputMode="numeric"
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
            <div className="aviator-bet-status win" role="status">
              You won ৳{game.myBet.payout} at {game.myBet.cashOutMultiplier}x
            </div>
          )}
          {game.myBet?.status === 'lost' && (
            <div className="aviator-bet-status lose" role="status">You lost ৳{game.myBet.amount}</div>
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
