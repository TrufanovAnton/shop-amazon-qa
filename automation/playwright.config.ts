import { defineConfig, devices } from '@playwright/test';

// Anti-bot notes: realistic locale headers reduce CAPTCHA frequency;
// workers=1 because parallel fresh sessions from one IP get flagged fast;
// retries=1 since a fresh context usually clears one-off interstitials.
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
      // Known limitation: Amazon serves a distinct mobile DOM for PDP/cart
      // (no span#productTitle, different buy box). The guest-checkout POM is
      // desktop-scoped; mobile coverage is the search suite. Documented in
      // README under "Known limitations".
      grep: /@search/,
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
