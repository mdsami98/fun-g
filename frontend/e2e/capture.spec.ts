import { test } from '@playwright/test';

/** Not an assertion test — captures real animation frames for review. */
test('capture live round', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.goto('/crash-chart?crash=9.5');
  const chart = page.locator('.cc-root').first();
  await chart.waitFor();

  // Wait for the round to actually leave the gate.
  await page.waitForFunction(() => {
    const el = document.querySelector('.cc-multiplier');
    return el && Number(el.textContent!.replace('x', '')) > 1.02;
  }, null, { timeout: 20_000 });

  for (let i = 0; i < 5; i += 1) {
    const m = await page.locator('.cc-multiplier').first().innerText();
    await chart.screenshot({ path: `e2e/shots/live-${i}-${m.replace('.', '_')}.png` });
    await page.waitForTimeout(1400);
  }

  // And the crash frame.
  await page.locator('.cc-crashed').first().waitFor({ timeout: 30_000 });
  const m = await page.locator('.cc-multiplier').first().innerText();
  await chart.screenshot({ path: `e2e/shots/crash-${m.replace('.', '_')}.png` });
});
