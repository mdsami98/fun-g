import {
  CRASH_SEED_COUNT,
  bestReturnAtAnyTarget,
  crashPointFromUniform,
  generateCrashScores,
  returnAtTarget,
} from './crash-seed-generator';

describe('crash seed generator', () => {
  const houseEdge = 0.03;
  const maxMultiplier = 1000;

  it('maps the bottom houseEdge share of the curve to 1.00x', () => {
    expect(crashPointFromUniform(0, houseEdge, maxMultiplier)).toBe(1);
    expect(crashPointFromUniform(0.029, houseEdge, maxMultiplier)).toBe(1);
    expect(crashPointFromUniform(0.5, houseEdge, maxMultiplier)).toBe(1.94);
  });

  it('caps at maxMultiplier', () => {
    expect(crashPointFromUniform(0.999999, houseEdge, maxMultiplier)).toBe(
      maxMultiplier,
    );
    expect(Math.max(...generateCrashScores(houseEdge, 50))).toBe(50);
  });

  it('builds 1000 scores within [1, maxMultiplier]', () => {
    const scores = generateCrashScores(houseEdge, maxMultiplier);
    expect(scores).toHaveLength(CRASH_SEED_COUNT);
    expect(Math.min(...scores)).toBe(1);
    expect(Math.max(...scores)).toBeLessThanOrEqual(maxMultiplier);
  });

  it('is deterministic', () => {
    expect(generateCrashScores(houseEdge, maxMultiplier)).toEqual(
      generateCrashScores(houseEdge, maxMultiplier),
    );
  });

  it('gives players about 1 - houseEdge back at common cash-out targets', () => {
    const scores = generateCrashScores(houseEdge, maxMultiplier);
    for (const target of [1.5, 2, 3, 5, 10]) {
      expect(returnAtTarget(scores, target)).toBeCloseTo(1 - houseEdge, 1);
    }
  });

  it.each([0.01, 0.03, 0.05])(
    'never lets any cash-out target beat 1 - houseEdge (houseEdge %p)',
    (edge) => {
      const scores = generateCrashScores(edge, maxMultiplier);
      expect(bestReturnAtAnyTarget(scores)).toBeLessThanOrEqual(1 - edge);
    },
  );
});
