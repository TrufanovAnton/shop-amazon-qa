import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Search box + results list (SERP).
 *
 * Verified stable hooks:
 *  - #twotabsearchtextbox           role=searchbox, aria-label "Search Amazon"
 *  - #nav-search-submit-button      submit
 *  - [data-component-type="s-search-result"] result card, carries [data-asin]
 *  - h2 inside card                 product title
 *  - [data-cy="price-recipe"] .a-price .a-offscreen   readable price text
 */
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

  /**
   * Open the first result whose title matches `pattern`.
   * Navigates by ASIN deep-link — immune to sponsored-tile overlay issues.
   */
  async openFirstMatchingResult(pattern: RegExp): Promise<string> {
    const card = this.resultCards
      .filter({ has: this.page.locator('h2', { hasText: pattern }) })
      .first();
    await expect(card, `no search result matching ${pattern}`).toBeVisible();
    const asin = await card.getAttribute('data-asin');
    if (!asin) throw new Error('Matched card has no data-asin');
    await this.open(`/dp/${asin}`);
    return asin;
  }

  /** At least `min` result cards rendered and each has a non-empty title. */
  async expectRelevantResults(pattern: RegExp, min = 1): Promise<void> {
    await expect(this.resultCards.first()).toBeVisible();
    expect(await this.resultCards.count()).toBeGreaterThanOrEqual(min);
    await expect(
      this.resultCards.filter({ has: this.page.locator('h2', { hasText: pattern }) }).first(),
      `expected at least one result title to match ${pattern}`,
    ).toBeVisible();
  }
}
