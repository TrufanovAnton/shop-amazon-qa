# Bug Reports

4 reports, all reproduced on www.amazon.com, 2026-08-04. Severity/priority definitions: test plan §5.
Screenshots and recordings: `docs/evidence/`.

---

## BUG-001: Failed cart quantity update leaves the item stuck on a spinner with no error, checkout stays enabled

| Field | Value |
|---|---|
| **Severity** | High. No workaround visible to the user, only a manual page reload recovers |
| **Priority** | P1 |
| **Feature area** | Cart |
| **Environment** | Chrome 141, macOS, 1568×745, signed in |
| **Preconditions** | 1 item in cart, cart page open, DevTools open |

**Steps to reproduce**

1. Open the cart with one item.
2. In DevTools, set Network to Offline.
3. Click the quantity "+" stepper.
4. Wait 30 seconds and watch the row.
5. Set Network back to Online, do not reload.

**Expected result**

An error like "Couldn't update quantity, try again", the stepper returns to the last saved quantity, checkout is blocked until the cart is consistent.

**Actual result**

The row greys out and shows a spinner indefinitely. No error, no retry. Delete and Save for later are also disabled, so the item can't even be removed. Subtotal and cart badge keep the optimistic values. "Proceed to checkout" stays clickable. Going back online does not recover the page, only a reload does.

**Notes**

After reload the cart shows the last saved value, so server data is fine. High, not Critical: the issue is the silent dead-end, not data loss.

**Attachments:** `BUG-001_offline-qty-infinite-spinner.mov`, `BUG-001_cart-baseline-qty1.jpg`, `BUG-001_cart-infinite-spinner-no-error.jpg`

---

## BUG-002: "Price: Low to High" puts items without any price at the top of the list

| Field | Value |
|---|---|
| **Severity** | Medium. The sort is useless in this state but browsing still works |
| **Priority** | P2 |
| **Feature area** | Search: sort and filters |
| **Environment** | Chrome 141, macOS, 1568×745, signed in, delivery location outside the US (Israel) |
| **Preconditions** | Delivery address set to a country many listings don't ship to |

**Steps to reproduce**

1. Search for "wireless mouse".
2. Sort by "Price: Low to High".
3. In Brands, tick Logitech.
4. Look through the list top to bottom.

**Expected result**

Every result in a price-sorted list has a visible price and the order is ascending. Items without an obtainable price either don't match this sort or go to the bottom.

**Actual result**

Only 4 cards out of 17 show a price, and those 4 sit below the price-less ones. The top two cards have no price, no "See options", no way to act on them at all: just a title and a rating. The same search without the brand filter shows prices on most cards, so the combination of sort, brand filter and a restrictive delivery location is what triggers it.

**Notes**

No console errors. Looks server-side: unshippable items get top-ranked in a sort that has no price for them. Related to BUG-004.

**Attachments:** `BUG-002_top-cards-without-price.mov`, `BUG-002_serp-price-sort-missing-prices_AND_BUG-003_location-conflict.jpg`

---

## BUG-004: Price filter $20–$84 returns items priced $8.69–$15.85

| Field | Value |
|---|---|
| **Severity** | High. The price filter is the main budget tool and it silently shows items that contradict it |
| **Priority** | P2 |
| **Feature area** | Search: price refinement |
| **Environment** | Chrome 141, macOS, signed in, delivery location outside the US (Israel) |
| **Preconditions** | Same as BUG-002 |

**Steps to reproduce**

1. Search for "wireless mouse", tick Logitech in Brands.
2. Set the price slider to $20–$84 and apply.
3. Check that the filter is really on: the sidebar shows "$20 – $84" with a "Reset price range" link and the result count drops to about 155.
4. Read the price on each card.

**Expected result**

Every visible price is between $20 and $84.

**Actual result**

7 of 16 cards show prices below $20: $15.85, $15.44, $10.78, $8.70, $12.31, $8.69, $14.26. The lowest is 57% under the filter floor.

**Notes**

All 7 offenders are "No featured offers available" cards showing the used & new price. Looks like the filter matches the featured price while the card displays the used-offer price. Also reproduced with the $12–$275 range.

**Attachments:** `BUG-004_price-filter-20-84-shows-15.85.jpg`

---

## BUG-005: "Compare with similar items" for a wireless mouse offers makeup sponges

| Field | Value |
|---|---|
| **Severity** | Medium. The widget's output is categorically wrong, right next to checkout |
| **Priority** | P2 |
| **Feature area** | Cart (mobile web), comparison widget |
| **Environment** | Chrome DevTools emulation, Samsung Galaxy A51/71, 412×914 and 914×412, mobile cart |
| **Preconditions** | A wireless mouse in the cart |

**Steps to reproduce**

1. In mobile emulation open the cart.
2. On the TECKNET Wireless Mouse line, tap "Compare with similar items".
3. Read the suggested products.

**Expected result**

The comparison set contains wireless mice, or at least computer accessories.

**Actual result**

All six tiles are cosmetics: Amazon Basics makeup blender sponges and foam wedges, e.l.f. sponge set, two Beautyblender items, M. Asam sponge trio. Not a single peripheral. Same result in both orientations.

**Notes**

Zero category overlap suggests the widget picks a wrong seed item, not a ranking issue. Filed for that reason.

**Attachments:** user screenshots, both orientations

---

## Checked, not confirmed

Sort survives applying a filter (suspected a reset, not reproduced). A failed cart update does not corrupt server state: after reconnect and reload the cart matched the last saved values. A one-off header/banner location mismatch ("Delivering to Nashville 37217" vs "items ship to Israel", screenshot in evidence) was seen once but did not reproduce on retry, so it was not filed.
