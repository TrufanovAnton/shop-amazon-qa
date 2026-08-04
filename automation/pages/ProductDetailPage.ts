import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Product Detail Page (PDP).
 *
 * Verified stable hooks:
 *  - #productTitle, #landingImage, #availability
 *  - #add-to-cart-button (INPUT, accessible name "Add to Cart")
 *  - #buy-now-button
 *  - #quantity                       quantity <select> (desktop buy box)
 *  - [id^="inline-twister-row-"]     variant dimension rows (color_name, style_name…)
 */
export class ProductDetailPage extends BasePage {
  readonly title: Locator;
  readonly price: Locator;
  readonly mainImage: Locator;
  readonly availability: Locator;
  readonly addToCartButton: Locator;
  readonly buyNowButton: Locator;
  readonly quantitySelect: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.locator('#productTitle');
    this.price = page.locator('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #corePrice_feature_div .a-price .a-offscreen').first();
    this.mainImage = page.locator('#landingImage');
    this.availability = page.locator('#availability');
    this.addToCartButton = page
      .getByRole('button', { name: /add to cart/i })
      .or(page.locator('#add-to-cart-button'))
      .first();
    this.buyNowButton = page.locator('#buy-now-button');
    this.quantitySelect = page.locator('#quantity');
  }

  async openByAsin(asin: string): Promise<void> {
    await this.open(`/dp/${asin}`);
    await expect(this.title).toBeVisible();
  }

  /** Variant row for a dimension, e.g. 'color_name' or 'style_name'. */
  variantRow(dimension: string): Locator {
    return this.page.locator(`#inline-twister-row-${dimension}`);
  }

  /** Select a variant swatch by its accessible name within a dimension. */
  async selectVariant(dimension: string, name: RegExp): Promise<void> {
    const swatch = this.variantRow(dimension).getByRole('button', { name }).first()
      .or(this.variantRow(dimension).locator('li', { hasText: name }).first());
    await swatch.click();
    // Variant switch re-renders the buy box; assert on outcome, not on sleep.
    await expect(this.addToCartButton).toBeVisible();
  }

  async setQuantity(qty: number): Promise<void> {
    if (await this.quantitySelect.isVisible().catch(() => false)) {
      await this.quantitySelect.selectOption(String(qty));
    }
  }

  /**
   * Add to cart and confirm via any of the three confirmation UIs Amazon
   * A/B-serves (side sheet, EWC panel, dedicated confirmation page).
   */
  async addToCart(): Promise<void> {
    await expect(this.addToCartButton).toBeEnabled();
    await this.addToCartButton.click();
    await this.dismissInterstitials(); // occasional warranty/coverage upsell
    const noThanks = this.page.getByRole('button', { name: /no thanks/i });
    if (await noThanks.isVisible().catch(() => false)) await noThanks.click();
    const confirmation = this.page
      .locator('#attach-added-to-cart-message')            // attach side sheet
      .or(this.page.locator('#NATC_SMART_WAGON_CONF_MSG_SUCCESS'))
      .or(this.page.getByText(/added to cart/i).first());  // confirmation page
    await expect(confirmation.first()).toBeVisible();
  }

  /** Numeric price parsed from the visible buy-box price. */
  async priceValue(): Promise<number> {
    const text = (await this.price.textContent()) ?? '';
    const value = Number(text.replace(/[^\d.]/g, ''));
    if (Number.isNaN(value)) throw new Error(`Cannot parse price from "${text}"`);
    return value;
  }
}
