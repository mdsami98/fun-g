import { defineConfig, devices } from '@playwright/test';

/**
 * Points at the already-running dev server (docker compose, port 1002).
 * No webServer block: the container owns the lifecycle.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:1002',
    trace: 'off',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
