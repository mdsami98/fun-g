import { test } from '@playwright/test';

test('capture countdown', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.goto('/crash-chart');
  const chart = page.locator('.cc-root').first();
  await chart.locator('.cc-start').waitFor();

  for (let i = 0; i < 4; i += 1) {
    const t = await chart.locator('.cc-start-count').innerText().catch(() => 'gone');
    if (t === 'gone') break;
    await chart.screenshot({ path: `e2e/shots/start-${i}-${t.replace('.', '_')}.png` });
    await page.waitForTimeout(2000);
  }
});
