import { defineConfig, devices } from '@playwright/test';

/**
 * ShopTest — Amazon.com QA automation.
 *
 * Anti-bot considerations (verified against live site, Aug 2026):
 *  - Realistic Accept-Language / UA reduce CAPTCHA ("dog page") frequency.
 *  - Workers = 1: parallel fresh sessions from one IP are the fastest way
 *    to get flagged. Sequential execution keeps runs stable.
 *  - retries = 1: a retried test lands on a fresh context, which usually
 *    clears a one-off interstitial.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: 1,
  workers: 1,
  forbidOnly: !!process.env.CI,
  use: {
    baseURL: 'https://www.amazon.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
