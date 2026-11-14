import { useEffect, useRef, useState } from 'react';

export type RoundPhase = 'waiting' | 'flying' | 'crashed';

export interface RoundState {
  phase: RoundPhase;
  /** Live multiplier, 1.00 upward. Frozen at the crash point once crashed. */
  multiplier: number;
  /** Seconds elapsed in the current flight. */
  elapsed: number;
  /** Set only once the round has crashed. */
  crashPoint: number | null;
  /**
   * Countdown bar fill during `waiting`, 1 → 0 across waitMs. Always 0
   * outside the waiting phase, so consumers can render it unconditionally.
   */
  waitProgress: number;
}

export interface CrashRoundOptions {
  /** Pre-round countdown, ms. The bar drains across exactly this window. */
  waitMs?: number;
  /** Pause on the crash screen before restarting, ms. */
  crashHoldMs?: number;
  /** Growth rate. Higher = faster acceleration. */
  growth?: number;
  /** Deterministic crash points, for tests/screenshots. */
  crashPoints?: number[];
}

/**
 * Multiplier as a function of elapsed time. Exponential, so it starts
 * slow and accelerates — matching "starts slow, accelerates" in the spec.
 * m(t) = e^(growth · t) gives a constant *relative* growth rate, which is
 * what makes the climb feel like it keeps pulling away.
 */
export function multiplierAt(elapsedSeconds: number, growth: number): number {
  return Math.exp(growth * elapsedSeconds);
}

/**
 * Sample a crash point from a house-edge distribution — the standard
 * crash-game curve, where P(crash ≥ m) = (1-edge)/m. Produces mostly low
 * multipliers with a long tail, instead of a flat random spread.
 */
function sampleCrashPoint(edge = 0.03): number {
  const u = Math.random();
  if (u < edge) return 1; // instant bust
  const value = (1 - edge) / (1 - u);
  return Math.max(1, Math.round(value * 100) / 100);
}

/**
 * Self-contained round loop: waiting → flying → crashed → waiting …
 *
 * Uses requestAnimationFrame for the flight so the multiplier and the
 * curve advance on the same clock as the paint, and stay smooth at 60fps.
 * setInterval would drift and tear against rAF-driven rendering.
 */
export function useCrashRound(options: CrashRoundOptions = {}): RoundState {
  const { waitMs = 8000, crashHoldMs = 3000, growth = 0.13, crashPoints } = options;

  const [state, setState] = useState<RoundState>({
    phase: 'waiting',
    multiplier: 1,
    elapsed: 0,
    crashPoint: null,
    waitProgress: 1,
  });

  // Kept in refs so the animation loop never restarts mid-round.
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scriptedIndex = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const clearPending = () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      frameRef.current = null;
      timerRef.current = null;
    };

    const startRound = () => {
      if (cancelled) return;

      const target =
        crashPoints && crashPoints.length
          ? crashPoints[scriptedIndex.current++ % crashPoints.length]
          : sampleCrashPoint();

      /* Start time comes from the FIRST rAF timestamp, not performance.now().
         The timestamp handed to a rAF callback is the frame's start time,
         which can predate the moment requestAnimationFrame was called — so
         seeding from performance.now() yields a negative first elapsed, and
         a multiplier below 1.00 that never climbs. */
      let startedAt: number | null = null;
      setState({ phase: 'flying', multiplier: 1, elapsed: 0, crashPoint: null, waitProgress: 0 });

      const tick = (now: number) => {
        if (cancelled) return;
        if (startedAt === null) startedAt = now;
        const elapsed = Math.max(0, (now - startedAt) / 1000);
        const current = Math.max(1, multiplierAt(elapsed, growth));

        if (current >= target) {
          setState({
            phase: 'crashed',
            multiplier: target,
            elapsed,
            crashPoint: target,
            waitProgress: 0,
          });
          timerRef.current = setTimeout(toWaiting, crashHoldMs);
          return;
        }

        setState({ phase: 'flying', multiplier: current, elapsed, crashPoint: null, waitProgress: 0 });
        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    };

    /* The countdown bar is driven by rAF rather than a CSS transition or a
       setInterval: it must stay in lockstep with the timer that actually
       starts the round, otherwise the bar can hit empty a beat before or
       after takeoff. One clock, one source of truth. */
    const toWaiting = () => {
      if (cancelled) return;

      let waitStart: number | null = null;
      setState((prev) => ({ ...prev, phase: 'waiting', waitProgress: 1 }));

      const countdown = (now: number) => {
        if (cancelled) return;
        if (waitStart === null) waitStart = now;
        const remaining = Math.max(0, 1 - (now - waitStart) / waitMs);

        if (remaining <= 0) {
          startRound();
          return;
        }

        setState((prev) => ({ ...prev, phase: 'waiting', waitProgress: remaining }));
        frameRef.current = requestAnimationFrame(countdown);
      };

      frameRef.current = requestAnimationFrame(countdown);
    };

    toWaiting();

    return () => {
      cancelled = true;
      clearPending();
    };
  }, [waitMs, crashHoldMs, growth, crashPoints]);

  return state;
}
