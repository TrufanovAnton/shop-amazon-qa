import { test, expect } from '../fixtures/pom';
import type { SearchResultsPage } from '../pages/SearchResultsPage';
import type { ProductDetailPage } from '../pages/ProductDetailPage';

// Guest E2E: Search -> PDP -> Add to Cart -> Cart -> sign-in gate. Stops at
// auth by design, no orders are placed. Search results mix offers a guest
// cannot buy, so the flow tries priced candidates until one is purchasable.
async function openFirstPurchasableResult(
  searchPage: SearchResultsPage,
  pdp: ProductDetailPage,
  pattern: RegExp,
): Promise<string> {
  const candidates = await searchPage.matchingPricedAsins(pattern, 5);
  expect(candidates.length, `no priced search results matching ${pattern}`).toBeGreaterThan(0);
  for (const asin of candidates) {
    await pdp.openByAsin(asin);
    if (await pdp.isPurchasable()) return asin;
  }
  throw new Error(
    `none of ${candidates.length} priced results matching ${pattern} is purchasable ` +
      '(Prime-exclusive deals / buy-box fallbacks / unshippable for this session)',
  );
}

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

    // 2. First result an anonymous session can actually buy
    await openFirstPurchasableResult(searchPage, pdp, /mouse/i);
    await expect(pdp.title).toBeVisible();
    await expect(pdp.title).toContainText(/mouse/i);
    const unitPrice = await pdp.priceValue();
    expect(unitPrice).toBeGreaterThan(0);

    // 3. Add to cart, confirmation UI appears (any A/B variant)
    await pdp.addToCart();

    // 4. Cart: exactly one line (cart stores the child variant ASIN, which
    // may differ from the parent ASIN captured on the search card)
    await cartPage.openCart();
    await expect(cartPage.cartItems).toHaveCount(1);
    const cartAsin = await cartPage.firstItemAsin();
    await cartPage.expectItemQuantity(cartAsin, 1);
    const subtotal = await cartPage.subtotalValue();
    expect(subtotal).toBeGreaterThan(0);
    await expect(cartPage.subtotalLabel).toContainText(/1 item/i);

    // 5. Proceed to checkout as guest -> sign-in gate. STOP here by design.
    await cartPage.proceedToCheckoutExpectingAuthRedirect();
  });

  test('cart state survives page reload (TC023)', async ({ searchPage, pdp, cartPage, page }) => {
    await searchPage.open('/');
    await searchPage.searchFor('usb c cable');
    await openFirstPurchasableResult(searchPage, pdp, /usb[- ]?c|type[- ]?c|cable/i);
    await pdp.addToCart();

    await cartPage.openCart();
    await expect(cartPage.cartItems).toHaveCount(1);
    const cartAsin = await cartPage.firstItemAsin();

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(cartPage.activeCart).toBeVisible();
    await cartPage.expectItemInCart(cartAsin); // no lost cart state
    await cartPage.expectItemQuantity(cartAsin, 1); // no duplicate lines
  });
});
