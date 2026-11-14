export const CRASH_SEED_COUNT = 1000;

/** Maps a uniform value r in [0, 1) to a crash point using the house-edge curve. */
export function crashPointFromUniform(
  r: number,
  houseEdge: number,
  maxMultiplier: number,
): number {
  const raw =
    r < houseEdge ? 1.0 : Math.floor((100 * (1 - houseEdge)) / (1 - r)) / 100;
  return Math.min(Math.max(raw, 1.0), maxMultiplier);
}

/**
 * Builds the default crash-score pool. Instead of random draws it takes the
 * low end of each of `count` equal slices of the curve (r = i / count).
 * Using the low end matters: with only 1000 values the top of the pool is
 * coarse, and any higher point would let a player who always cashes out just
 * below one of the top values get back more than they stake. With the low end,
 * no cash-out target returns more than 1 - houseEdge. Regenerating gives the
 * same values; round order comes from random picks at runtime.
 */
export function generateCrashScores(
  houseEdge: number,
  maxMultiplier: number,
  count = CRASH_SEED_COUNT,
): number[] {
  return Array.from({ length: count }, (_, i) =>
    crashPointFromUniform(i / count, houseEdge, maxMultiplier),
  );
}

/**
 * Average return per 1 unit staked for a player who always cashes out at
 * `target`, if rounds are drawn uniformly from `scores`. A cash-out at
 * `target` only wins when the round crashes above it.
 */
export function returnAtTarget(scores: number[], target: number): number {
  const wins = scores.filter((s) => s > target).length;
  return (target * wins) / scores.length;
}

/**
 * Best return any always-cash-out-at-X strategy can get from `scores`.
 * The best targets sit just below a score, so only those are checked.
 * The multiplier starts at 1.00x, so no target can be lower than that.
 */
export function bestReturnAtAnyTarget(scores: number[]): number {
  const targets = [...new Set(scores)]
    .filter((s) => s > 1)
    .map((s) => Math.max(1, s - 1e-9));
  return Math.max(...targets.map((t) => returnAtTarget(scores, t)));
}
