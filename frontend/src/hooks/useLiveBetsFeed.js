import { useEffect, useRef, useState } from 'react';

const AVATARS = ['😎', '🧑‍🦱', '👩‍🦰', '🧔', '👨‍🦲', '👩‍🦳', '🕶️', '👨‍🚀', '👩‍🎤', '🧑‍💼', '👨‍🎨', '👩‍🚀'];
const HANDLE_PREFIXES = ['u', 'P', 'x', 'A', 'k', 'R', 'J', 'M', 'S', 'D'];
const DUMMY_COUNT = 30;
const MAX_TARGET_MULTIPLIER = 50;

function randomHandle() {
  const prefix = HANDLE_PREFIXES[Math.floor(Math.random() * HANDLE_PREFIXES.length)];
  const digit = Math.floor(Math.random() * 10);
  return `${prefix}***${digit}`;
}

function randomAvatar() {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}

function randomBetAmount() {
  const skewed = Math.random() * Math.random() * 2000;
  return Math.max(10, Math.round(skewed / 10) * 10);
}

function randomTargetMultiplier() {
  const r = Math.random();
  const target = Math.floor(100 / (1 - r)) / 100;
  return Math.min(target, MAX_TARGET_MULTIPLIER);
}

function generateDummies() {
  return Array.from({ length: DUMMY_COUNT }, (_, i) => ({
    id: `dummy-${i}-${Math.random().toString(36).slice(2, 7)}`,
    isYou: false,
    handle: randomHandle(),
    avatar: randomAvatar(),
    amount: randomBetAmount(),
    target: randomTargetMultiplier(),
    cashOutMultiplier: null,
    payout: null,
  }));
}

const YOU_AVATAR = '🧑';
const SESSION_TOP_CAP = 50;

export function useLiveBetsFeed(game) {
  const [allBets, setAllBets] = useState(() => generateDummies());
  const [previousBets, setPreviousBets] = useState([]);
  const [previousCrashPoint, setPreviousCrashPoint] = useState(null);
  const [sessionTopBets, setSessionTopBets] = useState([]);
  const lastRoundIdRef = useRef(game.roundId);
  const lastPhaseRef = useRef(game.phase);

  // 1. New round -> fresh dummy pool
  useEffect(() => {
    if (game.roundId && game.roundId !== lastRoundIdRef.current) {
      lastRoundIdRef.current = game.roundId;
      setAllBets(generateDummies());
    }
  }, [game.roundId]);

  // 2. Reveal dummy cash-outs as the live multiplier climbs
  useEffect(() => {
    if (game.phase !== 'running') return;
    const multiplier = Number(game.multiplier);
    if (!Number.isFinite(multiplier)) return;

    setAllBets((bets) =>
      bets.map((bet) => {
        if (bet.isYou || bet.cashOutMultiplier !== null) return bet;
        if (bet.target > multiplier) return bet;
        return {
          ...bet,
          cashOutMultiplier: bet.target.toFixed(2),
          payout: (bet.amount * bet.target).toFixed(2),
        };
      }),
    );
  }, [game.multiplier, game.phase]);

  // 3. Merge the real logged-in user's own bet as a "You" entry
  useEffect(() => {
    setAllBets((bets) => {
      const withoutYou = bets.filter((b) => !b.isYou);
      if (!game.myBet) {
        return withoutYou.length === bets.length ? bets : withoutYou;
      }
      const youEntry = {
        id: 'you',
        isYou: true,
        handle: 'You',
        avatar: YOU_AVATAR,
        amount: Number(game.myBet.amount),
        target: null,
        cashOutMultiplier: game.myBet.status === 'cashed_out' ? game.myBet.cashOutMultiplier : null,
        payout: game.myBet.status === 'cashed_out' ? game.myBet.payout : null,
      };
      return [youEntry, ...withoutYou];
    });
  }, [game.myBet]);

  // 4. Freeze the final list into "previous", and fold its winners into the
  // session-wide top-wins leaderboard, the moment the round crashes
  useEffect(() => {
    if (game.phase === 'crashed' && lastPhaseRef.current !== 'crashed') {
      setPreviousBets(allBets);
      setPreviousCrashPoint(game.crashPoint);

      const roundMax = game.crashPoint;
      const winners = allBets
        .filter((b) => b.cashOutMultiplier !== null)
        .map((b) => ({ ...b, id: `${b.id}-${game.roundId}`, roundMax }));

      if (winners.length > 0) {
        setSessionTopBets((prev) =>
          [...prev, ...winners].sort((a, b) => Number(b.payout) - Number(a.payout)).slice(0, SESSION_TOP_CAP),
        );
      }
    }
    lastPhaseRef.current = game.phase;
  }, [game.phase, allBets, game.crashPoint, game.roundId]);

  const revealedCount = allBets.filter((b) => b.cashOutMultiplier !== null).length;
  const totalWin = allBets.reduce((sum, b) => sum + (b.payout ? Number(b.payout) : 0), 0);

  return {
    allBets,
    previousBets,
    previousCrashPoint,
    topBets: sessionTopBets,
    stats: {
      revealedCount,
      totalCount: allBets.length,
      totalWin: totalWin.toFixed(2),
    },
  };
}
