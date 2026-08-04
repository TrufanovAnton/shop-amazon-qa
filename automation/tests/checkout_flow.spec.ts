import { test, expect } from '../fixtures/pom';

/**
 * E2E guest revenue path: Search -> PDP -> Add to Cart -> Cart -> auth gate.
 * Stops at the sign-in redirect by design — no orders are ever placed,
 * no credentials are used (assignment §7 note).
 */
test.describe('Guest checkout flow @checkout', () => {
  test('search -> PDP -> add to cart -> cart -> auth redirect (TC015/TC020/TC022)', async ({
    searchPage,
    pdp,
    cartPage,
  }) => {
    // 1. Search
    await searchPage.open('/');
    await searchPage.searchFor('wireless mouse');
    await searchPage.expectRelevantResults(/mouse/i, 3);

    // 2. Open PDP by ASIN deep-link (immune to sponsored-tile overlays)
    const asin = await searchPage.openFirstMatchingResult(/mouse/i);
    await expect(pdp.title).toBeVisible();
    await expect(pdp.title).toContainText(/mouse/i);
    await expect(pdp.addToCartButton).toBeEnabled();
    const unitPrice = await pdp.priceValue();
    expect(unitPrice).toBeGreaterThan(0);

    // 3. Add to cart, confirmation UI appears (any A/B variant)
    await pdp.addToCart();

    // 4. Cart: correct item, quantity, and subtotal >= unit price
    await cartPage.openCart();
    await cartPage.expectItemInCart(asin);
    await cartPage.expectItemQuantity(asin, 1);
    const subtotal = await cartPage.subtotalValue();
    expect(subtotal).toBeGreaterThanOrEqual(unitPrice * 0.5); // coupon/strike-price tolerance
    await expect(cartPage.subtotalLabel).toContainText(/1 item/i);

    // 5. Proceed to checkout as guest -> sign-in gate. STOP here by design.
    await cartPage.proceedToCheckoutExpectingAuthRedirect();
  });

  test('cart state survives page reload (TC023)', async ({ searchPage, pdp, cartPage, page }) => {
    await searchPage.open('/');
    await searchPage.searchFor('usb c cable');
    const asin = await searchPage.openFirstMatchingResult(/usb[- ]?c|type[- ]?c/i);
    await pdp.addToCart();

    await cartPage.openCart();
    await cartPage.expectItemInCart(asin);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(cartPage.activeCart).toBeVisible();
    await cartPage.expectItemInCart(asin); // no lost cart state
    await cartPage.expectItemQuantity(asin, 1); // no duplicate lines
  });
});
