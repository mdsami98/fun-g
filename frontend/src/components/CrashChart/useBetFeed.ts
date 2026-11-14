import { useEffect, useRef, useState } from 'react';
import type { RoundPhase } from './useCrashRound';

export interface FeedBet {
  id: number;
  /** Masked player id, e.g. "*******29". */
  label: string;
  amount: number;
}

const MAX_ROWS = 6;

function maskedId(): string {
  return `*******${Math.floor(Math.random() * 90 + 10)}`;
}

function randomAmount(): number {
  const base = [28.73, 51.28, 70.65, 91.17, 161.19, 358.22, 423.32];
  const pick = base[Math.floor(Math.random() * base.length)];
  return Math.round((pick + (Math.random() * 40 - 20)) * 100) / 100;
}

/**
 * Trickles fake bets in while a round is flying, so the feed animates.
 * Rows are capped and the oldest drop off the end.
 */
export function useBetFeed(phase: RoundPhase): FeedBet[] {
  const [bets, setBets] = useState<FeedBet[]>([]);
  const nextId = useRef(0);

  useEffect(() => {
    if (phase !== 'flying') return undefined;

    // Fresh round, fresh feed.
    setBets([]);

    const push = () => {
      setBets((prev) =>
        [{ id: nextId.current++, label: maskedId(), amount: randomAmount() }, ...prev].slice(
          0,
          MAX_ROWS,
        ),
      );
    };

    push();
    const interval = setInterval(push, 700 + Math.random() * 500);
    return () => clearInterval(interval);
  }, [phase]);

  return bets;
}
