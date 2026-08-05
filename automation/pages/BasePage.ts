import { Page, Locator, expect } from '@playwright/test';

/** Shared behaviour: navigation, bot-wall detection, popup dismissal. */
export abstract class BasePage {
  protected constructor(protected readonly page: Page) {}

  /** Nav cart badge — stable across all pages. */
  get cartBadge(): Locator {
    return this.page.locator('#nav-cart-count');
  }

  async open(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    await this.failFastOnBotWall();
    await this.dismissInterstitials();
    await this.ensureUsDeliveryLocation();
  }

  // Set a US ZIP once per context: non-US IP locations get degraded buy boxes.
  // Best-effort, tests continue on the IP location if the modal is not served.
  protected async ensureUsDeliveryLocation(zip = '10001'): Promise<void> {
    const ctx = this.page.context() as unknown as { __usZipSet?: boolean };
    if (ctx.__usZipSet) return;
    try {
      const glow = this.page.locator('#nav-global-location-popover-link');
      const label = (await glow.textContent().catch(() => '')) ?? '';
      if (new RegExp(`\\b${zip}\\b`).test(label)) { ctx.__usZipSet = true; return; }
      await glow.click({ timeout: 5_000 });
      const input = this.page.locator('#GLUXZipUpdateInput');
      await input.waitFor({ state: 'visible', timeout: 10_000 });
      await input.fill(zip);
      await this.page
        .locator('#GLUXZipUpdate input[type="submit"], input[aria-labelledby="GLUXZipUpdate-announce"]')
        .first()
        .click();
      const done = this.page
        .locator('#GLUXConfirmClose, button[name="glowDoneButton"]')
        .or(this.page.getByRole('button', { name: /done|continue/i }))
        .first();
      await done.click({ timeout: 5_000 }).catch(() => {});
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      ctx.__usZipSet = true;
    } catch {
      // continue with IP-based location; downstream code handles fallbacks
    }
  }

  /** Explicit error instead of a cryptic timeout when the CAPTCHA wall appears. */
  protected async failFastOnBotWall(): Promise<void> {
    const captcha = this.page.locator('form[action*="validateCaptcha"]');
    if (await captcha.isVisible().catch(() => false)) {
      throw new Error(
        'Amazon served a CAPTCHA interstitial (bot wall). ' +
          'Re-run later, from another IP, or run headed (npm run test:headed).',
      );
    }
  }

  /** Best-effort, non-failing dismissal of known dynamic popups. */
  protected async dismissInterstitials(): Promise<void> {
    // Occasional full-page bot-check with a single button.
    const continueShopping = this.page.getByRole('button', { name: /continue shopping/i });
    if (await continueShopping.isVisible().catch(() => false)) {
      await continueShopping.click().catch(() => {});
    }
    // Delivery-location popover ("Deliver to ...").
    const dismissAddress = this.page.locator(
      '#glow-toaster button[data-action-type="DISMISS"], input[data-action-type="DISMISS"]',
    );
    if (await dismissAddress.first().isVisible().catch(() => false)) {
      await dismissAddress.first().click().catch(() => {});
    }
  }

  /** Web-first assertion helper: badge shows the expected count. */
  async expectCartBadge(count: number): Promise<void> {
    await expect(this.cartBadge).toHaveText(String(count));
  }
}
