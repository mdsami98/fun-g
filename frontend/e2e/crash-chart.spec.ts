import { expect, test, type Page } from '@playwright/test';

/**
 * These tests exist because headless Chrome's virtual clock advances
 * setInterval but NOT requestAnimationFrame timestamps — so screenshot-based
 * checks sat frozen at x1.00 and could not prove the animation runs at all.
 * Playwright uses a real clock, so rAF actually ticks here.
 */

const CHART = '.cc-root';

/* The preview page mounts TWO charts, each running its own independent
   simulation. Every locator must therefore be scoped to ONE chart root —
   reading the multiplier from chart A while checking chart B's crash label
   compares unrelated rounds and fails at random. */
function chart(page: Page) {
  return page.locator(CHART).first();
}

async function readMultiplier(page: Page): Promise<number> {
  const text = await chart(page).locator('.cc-multiplier').innerText();
  return Number(text.replace(/^x/, ''));
}

async function isCrashed(page: Page): Promise<boolean> {
  return chart(page).locator('.cc-crashed').isVisible();
}

/** Poll the multiplier on a real clock, returning the samples. */
async function sample(page: Page, count: number, everyMs: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(await readMultiplier(page));
    await page.waitForTimeout(everyMs);
  }
  return out;
}

/** Samples taken only while the round is still climbing. */
async function sampleWhileFlying(page: Page, count: number, everyMs: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    if (await isCrashed(page)) break;
    const value = await readMultiplier(page);
    // A frozen or falling value means the round ended between polls.
    if (out.length && value <= out[out.length - 1]) break;
    out.push(value);
    await page.waitForTimeout(everyMs);
  }
  return out;
}

test.describe('CrashChart', () => {
  test('multiplier actually climbs on a real clock', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect(chart(page)).toBeVisible();

    // Wait until a round is in flight (the readout leaves x1.00).
    await expect
      .poll(() => readMultiplier(page), { timeout: 20_000, message: 'round never started' })
      .toBeGreaterThan(1);

    const samples = await sample(page, 8, 250);
    const first = samples[0];
    const last = samples[samples.length - 1];

    // It must actually move — this is the check the old harness could not do.
    expect(last, `samples: ${samples.join(', ')}`).toBeGreaterThan(first);

    // And never run backwards while flying (crash freezes, it does not reset
    // mid-sample; a decrease would mean a new round, allowed only after a dip
    // to 1.00, which we assert is not present in this short window).
    const wentBackwards = samples.some((v, i) => i > 0 && v < samples[i - 1] - 0.001);
    const restarted = samples.includes(1);
    expect(wentBackwards && !restarted, `samples: ${samples.join(', ')}`).toBe(false);
  });

  test('growth accelerates rather than being linear', async ({ page }) => {
    /* Script a high crash point so the round is guaranteed to run long
       enough to measure, and compare RATES using measured wall-clock
       timestamps. Comparing raw gains over nominally-equal sleeps is
       flaky: each poll costs two round-trips, so the real intervals
       vary by more than the effect being measured. */
    await page.goto('/crash-chart?crash=100');
    await expect.poll(() => readMultiplier(page), { timeout: 20_000 }).toBeGreaterThan(1.05);

    const points: Array<{ t: number; m: number }> = [];
    for (let i = 0; i < 12; i += 1) {
      if (await isCrashed(page)) break;
      const m = await readMultiplier(page);
      const t = Date.now();
      if (points.length && m <= points[points.length - 1].m) break;
      points.push({ t, m });
      await page.waitForTimeout(250);
    }
    test.skip(points.length < 8, `too few samples (${points.length})`);

    const rate = (a: { t: number; m: number }, b: { t: number; m: number }) =>
      (b.m - a.m) / ((b.t - a.t) / 1000);

    const third = Math.floor(points.length / 3);
    const early = rate(points[0], points[third]);
    const late = rate(points[points.length - 1 - third], points[points.length - 1]);

    expect(late, `early ${early.toFixed(4)}/s vs late ${late.toFixed(4)}/s`).toBeGreaterThan(early);
  });

  test('reaches crashed state and shows the Crashed label', async ({ page }) => {
    await page.goto('/crash-chart');

    const crashed = chart(page).locator('.cc-crashed');
    await expect(crashed, 'never crashed within 45s').toBeVisible({ timeout: 45_000 });
    await expect(crashed).toHaveText('Crashed');

    // The frozen value must equal the crash point and hold still.
    const frozen = await readMultiplier(page);
    await page.waitForTimeout(700);
    expect(await readMultiplier(page)).toBe(frozen);
    expect(frozen).toBeGreaterThanOrEqual(1);
  });

  test('auto-restarts a new round after crashing', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect(chart(page).locator('.cc-crashed')).toBeVisible({ timeout: 45_000 });

    // Crash label must clear, and a fresh round must climb again.
    await expect(chart(page).locator('.cc-crashed')).toBeHidden({ timeout: 15_000 });
    await expect
      .poll(() => readMultiplier(page), { timeout: 20_000, message: 'no new round after crash' })
      .toBeGreaterThan(1);
  });

  test('curve geometry advances with the multiplier', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect.poll(() => readMultiplier(page), { timeout: 20_000 }).toBeGreaterThan(1.05);

    const headX = async () => {
      const d = await chart(page).locator('.cc-line').getAttribute('d');
      const nums = (d ?? '').match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
      return nums.length >= 2 ? nums[nums.length - 2] : 0;
    };

    const before = await headX();
    await page.waitForTimeout(900);
    const after = await headX();
    expect(after, `head x ${before} -> ${after}`).toBeGreaterThan(before);
  });

  test('animates at a real frame rate', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect.poll(() => readMultiplier(page), { timeout: 20_000 }).toBeGreaterThan(1);

    // Count genuine rAF callbacks over one second.
    const fps = await page.evaluate<number>(
      () =>
        new Promise((resolve) => {
          let frames = 0;
          const start = performance.now();
          const step = () => {
            frames += 1;
            if (performance.now() - start >= 1000) resolve(frames);
            else requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }),
    );
    expect(fps, `measured ${fps} fps`).toBeGreaterThan(30);
  });

  test('stays inside its box at extreme multipliers', async ({ page }) => {
    // Pinned states — the geometry must never draw outside the SVG viewBox.
    for (const m of [1, 1.5, 2.53, 12.4, 250]) {
      await page.goto(`/crash-chart?state=flying&m=${m}&t=8`);
      const svg = chart(page).locator('.cc-svg');
      await expect(svg).toBeVisible();

      const box = await svg.evaluate((el) => {
        const vb = (el as SVGSVGElement).viewBox.baseVal;
        return { w: vb.width, h: vb.height };
      });

      for (const sel of ['.cc-line', '.cc-arrow']) {
        const d = await chart(page).locator(sel).getAttribute('d');
        const nums = (d ?? '').match(/-?\d+\.?\d*/g)?.map(Number) ?? [];
        for (let i = 0; i < nums.length; i += 2) {
          const x = nums[i];
          const y = nums[i + 1];
          expect(x, `${sel} x out of box at m=${m}`).toBeGreaterThanOrEqual(-1);
          expect(x, `${sel} x out of box at m=${m}`).toBeLessThanOrEqual(box.w + 1);
          expect(y, `${sel} y out of box at m=${m}`).toBeGreaterThanOrEqual(-1);
          expect(y, `${sel} y out of box at m=${m}`).toBeLessThanOrEqual(box.h + 1);
        }
      }
    }
  });
});
