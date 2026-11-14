import { expect, test, type Page } from '@playwright/test';

const chart = (page: Page) => page.locator('.cc-root').first();
const bar = (page: Page) => chart(page).locator('.cc-start-bar-fill');

/** Bar fill as a fraction 0..1, read from its rendered width. */
async function fill(page: Page): Promise<number> {
  return bar(page).evaluate((el) => {
    const track = el.parentElement!;
    return el.getBoundingClientRect().width / track.getBoundingClientRect().width;
  });
}

test.describe('StartScreen countdown', () => {
  test('bar drains from full to empty and starts the round', async ({ page }) => {
    await page.goto('/crash-chart');

    // The screen is up immediately on mount.
    await expect(chart(page).locator('.cc-start')).toBeVisible();
    expect(await fill(page)).toBeGreaterThan(0.9);

    const samples: Array<{ t: number; f: number }> = [];
    const started = Date.now();
    for (let i = 0; i < 10; i += 1) {
      if (!(await chart(page).locator('.cc-start').isVisible())) break;
      samples.push({ t: Date.now() - started, f: await fill(page) });
      await page.waitForTimeout(600);
    }

    // Strictly decreasing — never jumps back up.
    for (let i = 1; i < samples.length; i += 1) {
      expect(
        samples[i].f,
        `sample ${i}: ${samples.map((s) => s.f.toFixed(2)).join(', ')}`,
      ).toBeLessThanOrEqual(samples[i - 1].f + 0.02);
    }
    expect(samples[samples.length - 1].f).toBeLessThan(samples[0].f - 0.2);
  });

  test('takes ~8s and the round begins exactly when the bar empties', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect(chart(page).locator('.cc-start')).toBeVisible();

    const t0 = Date.now();
    // Wait for the start screen to disappear = round begins.
    await expect(chart(page).locator('.cc-start')).toBeHidden({ timeout: 15_000 });
    const elapsed = (Date.now() - t0) / 1000;

    expect(elapsed, `countdown lasted ${elapsed.toFixed(2)}s`).toBeGreaterThan(7);
    expect(elapsed, `countdown lasted ${elapsed.toFixed(2)}s`).toBeLessThan(9);

    // And flight is genuinely underway right after.
    await expect
      .poll(
        async () =>
          Number((await chart(page).locator('.cc-multiplier').innerText()).replace('x', '')),
        { timeout: 5_000 },
      )
      .toBeGreaterThan(1);
  });

  test('countdown readout agrees with the bar', async ({ page }) => {
    await page.goto('/crash-chart');
    await expect(chart(page).locator('.cc-start')).toBeVisible();
    await page.waitForTimeout(2500);

    const f = await fill(page);
    const text = await chart(page).locator('.cc-start-count').innerText();
    const seconds = Number(text.replace('s', ''));

    // Readout is progress x 8s; allow a frame of drift between the two reads.
    expect(Math.abs(seconds - f * 8), `bar ${f.toFixed(3)} vs readout ${seconds}s`).toBeLessThan(
      0.5,
    );
  });

  test('start screen reappears between rounds', async ({ page }) => {
    await page.goto('/crash-chart?crash=1.05');
    await expect(chart(page).locator('.cc-start')).toBeHidden({ timeout: 15_000 });
    await expect(chart(page).locator('.cc-crashed')).toBeVisible({ timeout: 30_000 });
    await expect(chart(page).locator('.cc-start')).toBeVisible({ timeout: 15_000 });
    expect(await fill(page)).toBeGreaterThan(0.8);
  });
});
