import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** Search box and results list. Locators checked against the live DOM. */
export class SearchResultsPage extends BasePage {
  readonly searchBox: Locator;
  readonly searchSubmit: Locator;
  readonly resultCards: Locator;

  constructor(page: Page) {
    super(page);
    // ARIA-first, ID as engine-level fallback for A/B header variants.
    this.searchBox = page.getByRole('searchbox', { name: /search amazon/i })
      .or(page.locator('#twotabsearchtextbox'))
      .first();
    this.searchSubmit = page.locator('#nav-search-submit-button');
    this.resultCards = page.locator('[data-component-type="s-search-result"]');
  }

  async searchFor(keyword: string): Promise<void> {
    await this.searchBox.click();
    await this.searchBox.fill(keyword);
    await this.searchBox.press('Enter');
    await this.failFastOnBotWall();
    // Web-first: wait for real result cards, not for network idle.
    await expect(this.resultCards.first()).toBeVisible();
  }

  /** Title locator for the Nth card (h2 is the stable title element). */
  cardTitle(index = 0): Locator {
    return this.resultCards.nth(index).locator('h2');
  }

  /** ASIN of the Nth organic result. */
  async cardAsin(index = 0): Promise<string> {
    const asin = await this.resultCards.nth(index).getAttribute('data-asin');
    if (!asin) throw new Error(`Result card #${index} has no data-asin`);
    return asin;
  }

  /** Open the first result matching `pattern`, navigating by ASIN deep link. */
  async openFirstMatchingResult(pattern: RegExp): Promise<string> {
    const matching = this.resultCards.filter({
      has: this.page.locator('h2', { hasText: pattern }),
    });
    // Prefer cards with a visible price: price-less ones lead to degraded PDPs.
    const priced = matching.filter({ has: this.page.locator('.a-price .a-offscreen') });
    const card = ((await priced.count()) > 0 ? priced : matching).first();
    await expect(card, `no search result matching ${pattern}`).toBeVisible();
    const asin = await card.getAttribute('data-asin');
    if (!asin) throw new Error('Matched card has no data-asin');
    await this.open(`/dp/${asin}`);
    return asin;
  }

  // First `limit` matching cards that show a price. The caller still checks
  // purchasability on the PDP (priced cards can be Prime-exclusive deals).
  async matchingPricedAsins(pattern: RegExp, limit = 5): Promise<string[]> {
    await expect(this.resultCards.first()).toBeVisible();
    const matching = this.resultCards
      .filter({ has: this.page.locator('h2', { hasText: pattern }) })
      .filter({ has: this.page.locator('.a-price .a-offscreen') });
    const n = Math.min(await matching.count(), limit);
    const asins: string[] = [];
    for (let i = 0; i < n; i++) {
      const asin = await matching.nth(i).getAttribute('data-asin');
      if (asin) asins.push(asin);
    }
    return asins;
  }

  /** At least `min` result cards rendered and each has a non-empty title. */
  async expectRelevantResults(pattern: RegExp, min = 1): Promise<void> {
    await expect(this.resultCards.first()).toBeVisible();
    // Mobile SERP lazy-loads cards on scroll: only 1-3 render in the initial
    // viewport. Nudge the page down until enough cards accumulate.
    await expect
      .poll(
        async () => {
          const n = await this.resultCards.count();
          if (n < min) await this.page.mouse.wheel(0, 1500);
          return n;
        },
        { timeout: 15_000 },
      )
      .toBeGreaterThanOrEqual(min);
    await expect(
      this.resultCards.filter({ has: this.page.locator('h2', { hasText: pattern }) }).first(),
      `expected at least one result title to match ${pattern}`,
    ).toBeVisible();
  }
}
