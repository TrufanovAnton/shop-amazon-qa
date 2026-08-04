import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Shopping cart.
 *
 * Verified stable hooks:
 *  - #sc-active-cart                      active-cart container
 *  - .sc-list-item[data-asin]             cart line, carries data-price
 *  - #sc-subtotal-amount-activecart       subtotal
 *  - #sc-subtotal-label-activecart        "Subtotal (N items):"
 *  - #sc-buy-box-ptc-button               Proceed to checkout
 *  - [data-action="delete"]               per-line delete control
 */
export class CartPage extends BasePage {
  readonly activeCart: Locator;
  readonly cartItems: Locator;
  readonly subtotal: Locator;
  readonly subtotalLabel: Locator;
  readonly proceedToCheckoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.activeCart = page.locator('#sc-active-cart');
    this.cartItems = page.locator('#sc-active-cart .sc-list-item[data-asin]');
    this.subtotal = page.locator('#sc-subtotal-amount-activecart');
    this.subtotalLabel = page.locator('#sc-subtotal-label-activecart');
    this.proceedToCheckoutButton = page
      .getByRole('button', { name: /proceed to checkout/i })
      .or(page.locator('#sc-buy-box-ptc-button'))
      .first();
  }

  async openCart(): Promise<void> {
    await this.open('/gp/cart/view.html');
    await expect(this.activeCart).toBeVisible();
  }

  itemByAsin(asin: string): Locator {
    return this.page.locator(`#sc-active-cart .sc-list-item[data-asin="${asin}"]`);
  }

  async expectItemInCart(asin: string): Promise<void> {
    await expect(this.itemByAsin(asin)).toBeVisible();
  }

  /** Quantity shown for a line — supports both stepper and dropdown UIs. */
  async itemQuantity(asin: string): Promise<number> {
    const item = this.itemByAsin(asin);
    const stepperValue = item.locator('[data-a-selector="value"], .sc-quantity-textfield');
    if (await stepperValue.first().isVisible().catch(() => false)) {
      const raw = (await stepperValue.first().inputValue().catch(() => null))
        ?? (await stepperValue.first().textContent()) ?? '';
      return Number(raw.trim());
    }
    const dropdown = item.locator('select[name="quantity"]');
    return Number(await dropdown.inputValue());
  }

  async expectItemQuantity(asin: string, qty: number): Promise<void> {
    await expect.poll(() => this.itemQuantity(asin), { timeout: 15_000 }).toBe(qty);
  }

  /** Parsed subtotal, e.g. "$25.16" -> 25.16. */
  async subtotalValue(): Promise<number> {
    const text = (await this.subtotal.textContent()) ?? '';
    const value = Number(text.replace(/[^\d.]/g, ''));
    if (Number.isNaN(value)) throw new Error(`Cannot parse subtotal from "${text}"`);
    return value;
  }

  /**
   * Click Proceed to checkout as a guest and assert the auth gate:
   * URL moves to /ap/signin (or /checkout sign-in variant) and the
   * email/phone field is shown. Never proceeds past authentication.
   */
  async proceedToCheckoutExpectingAuthRedirect(): Promise<void> {
    await expect(this.proceedToCheckoutButton).toBeEnabled();
    await this.proceedToCheckoutButton.click();
    await this.page.waitForURL(/\/(ap\/signin|checkout)/, { timeout: 30_000 });
    const signInField = this.page
      .getByLabel(/email|mobile phone number/i)
      .or(this.page.locator('#ap_email, #ap_email_login'))
      .first();
    await expect(signInField).toBeVisible();
  }
}
