import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/** Product detail page. Locators checked against the live DOM. */
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
    // The PDP also has a hidden <input id="productTitle"> (duplicate id), hence the span.
    this.title = page.locator('span#productTitle');
    this.price = page.locator('#corePriceDisplay_desktop_feature_div .a-price .a-offscreen, #corePrice_feature_div .a-price .a-offscreen').first();
    this.mainImage = page.locator('#landingImage');
    this.availability = page.locator('#availability');
    // input-scoped: a hidden shortcut-menu <button> in the header shares the
    // same accessible name and wins any role query (DOM order).
    this.addToCartButton = page.locator('input#add-to-cart-button');
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

  // Purchasable = the real Add to Cart is visible. Hidden cases seen live:
  // Prime-exclusive deals, variant-selection fallback, unshippable listings.
  async isPurchasable(): Promise<boolean> {
    if (await this.addToCartButton.isVisible().catch(() => false)) return true;
    await this.selectFirstAvailableVariants(); // bbf: try resolving dims once
    return this.addToCartButton.isVisible().catch(() => false);
  }

  // Fallback buy box hides Add to Cart until every variant dimension is picked.
  private async selectFirstAvailableVariants(): Promise<void> {
    const rows = this.page.locator('[id^="inline-twister-row-"]');
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const swatch = rows
        .nth(i)
        .locator('li:not([class*="unavailable"])')
        .first();
      if (await swatch.isVisible().catch(() => false)) {
        await swatch.click().catch(() => {});
        await this.page.waitForTimeout(300); // twister re-render debounce
      }
    }
  }

  async addToCart(): Promise<void> {
    if (!(await this.addToCartButton.isVisible().catch(() => false))) {
      await this.selectFirstAvailableVariants();
    }
    await expect(this.addToCartButton).toBeVisible();
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
