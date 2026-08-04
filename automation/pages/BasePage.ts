import { Page, Locator, expect } from '@playwright/test';

/**
 * Shared behaviour: navigation, anti-bot detection, popup dismissal.
 *
 * Amazon-specific reality (verified on live DOM):
 *  - no data-testid attributes; stable hooks are semantic IDs, ARIA roles,
 *    data-component-type / data-asin / data-cy attributes;
 *  - random interstitials: CAPTCHA "dog page", delivery-location popover,
 *    "continue shopping" bot-check button.
 */
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
  }

  /**
   * Fail with an explicit, actionable message instead of a cryptic
   * locator timeout when Amazon serves the CAPTCHA wall.
   */
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
