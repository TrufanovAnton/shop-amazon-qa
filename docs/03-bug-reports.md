# Bug Reports — ShopTest: Amazon.com

**Deliverable B** · 5 reports · All **reproduced live on www.amazon.com** on 2026-08-04. Severity/priority per definitions in the test plan §5.
Screenshots referenced below are in `docs/evidence/`.

---

## BUG-001 — Failed cart quantity update leaves the line item permanently stuck in a loading spinner with no error and no retry; checkout stays enabled

| Field | Value |
|---|---|
| **Bug ID** | BUG-001 |
| **Title** | If the quantity-update request fails, the cart line enters an infinite spinner state, is disabled indefinitely, shows no error and offers no retry — while "Proceed to checkout" remains enabled against an unresolved cart |
| **Severity** | **High** — the money path dead-ends with no workaround visible to the user (only a manual reload recovers) |
| **Priority** | **P1** — state-integrity defect in the redesigned Cart flow; blocks sign-off |
| **Feature area** | Cart & Checkout — quantity update, network resilience |
| **Environment** | Chrome 141 (Chromium 141.0), macOS, desktop viewport 1568×745, signed-in session, delivery location "Israel" |
| **Preconditions** | Signed in; exactly 1 line item in the cart (qty 2, subtotal $19.98); cart page `/gp/cart/view.html` open |

**Steps to reproduce**

1. Open the cart with one item.
2. Simulate loss of connectivity for XHR/fetch — DevTools → Network → **Offline** (I used equivalent console fault injection: `window.fetch = () => Promise.reject(new TypeError('Failed to fetch'))`).
3. Click the quantity **“+”** stepper on the line item.
4. Observe the line item, subtotal, cart badge and the "Proceed to checkout" button for ≥ 30 s.
5. Restore connectivity **without** reloading; keep observing.

**Expected result**

The failed update surfaces an explicit, actionable error ("Couldn't update quantity — Retry"), the stepper returns to an interactive state at the last persisted quantity, and either the checkout button is blocked or the cart is re-synced before it can be used.

**Actual result**

The whole line item greys out (`opacity: 1` container replaced by a disabled state), the stepper is replaced by an `.a-spinner`, and a second large spinner renders in the middle of the row. Verified state at **>35 s** after the failure:

| Check | Value |
|---|---|
| Spinner still present | `true` |
| Any error text on page (`/try again｜couldn't｜unable｜error｜problem/i`) | `false` |
| Any retry control | `false` |
| Subtotal | `$19.98` (stale) |
| Nav cart badge | `2` (stale) |
| `#sc-buy-box-ptc-button` enabled | **`true`** |

Delete / Save for later / Compare are also greyed out, so the user cannot even remove the item. Restoring connectivity does **not** self-heal — only a page reload recovers.

**Technical / console notes**

Exactly **1** outbound request was attempted and rejected; the rejection is swallowed with no `.catch` path surfacing to the UI and no timeout on the spinner. **Positive finding:** after reload the cart correctly shows qty 2 / $19.98 — the failed increment was *not* persisted, so there is **no server-side data corruption and no duplicate submission**. That is why this is rated High and not Critical. The severity driver is the un-recoverable client dead-end plus an enabled checkout button over unconfirmed cart state.

**Attachments** · `evidence/BUG-001_cart-baseline-qty1.jpg` (baseline), `evidence/BUG-001_cart-infinite-spinner-no-error.jpg` (defect — spinner, disabled row, no error, checkout still enabled)

---

## BUG-002 — "Price: Low to High" sort ranks price-less items at the top; some results render with no price and no purchase control at all

| Field | Value |
|---|---|
| **Bug ID** | BUG-002 |
| **Title** | With sort = "Price: Low to High" plus a brand filter, 13 of 17 result cards render without any price, and 2 of them render with neither a price nor any buying affordance — yet they occupy the first positions of the price-ascending list |
| **Severity** | **Medium** — results are still browsable, but the chosen sort is functionally meaningless and some cards are un-actionable |
| **Priority** | **P2** — degrades the top of the purchase funnel; fix this sprint |
| **Feature area** | Search — sort & filters, result card rendering |
| **Environment** | Chrome 141, macOS, desktop 1568×745, signed-in, delivery location "Israel" |
| **Preconditions** | Signed in; delivery location set to a country where many listings are not shippable |

**Steps to reproduce**

1. Open `https://www.amazon.com/s?k=wireless+mouse&s=price-asc-rank`.
2. In the left rail under **Brands**, tick **Logitech**.
3. Inspect the rendered cards top-to-bottom.

**Expected result**

Every item in a price-sorted list carries a comparable price and is ordered ascending; items with no obtainable price are either excluded from a price sort or placed after the priced ones with a clear "no price available" state and a route to offers.

**Actual result**

Of 17 `[data-component-type="s-search-result"]` cards, **only 4 render a price** (`$9.88, $9.99, $10.87, $14.99`) — and those 4 sit *below* the price-less ones. The top two cards (`B0FGQT847L`, `B08C9JPV59`) have **no `[data-cy="price-recipe"]` element at all**, no "See options", no "No featured offers available" — just a title and a star rating, i.e. no way to act on them. Cards 3–4 at least degrade to "See options / No featured offers available / $9.50 (11 used & new offers)".

Measured across four independent requests in the same session (priced cards / total cards):

| Query | Result |
|---|---|
| `?k=wireless+mouse` (Featured) | 17 / 24 |
| `?k=wireless+mouse&s=price-asc-rank` | 15 / 18 |
| `?k=wireless+mouse&rh=…Logitech&s=price-asc-rank` | **4 / 17** |
| `?k=mechanical+keyboard&s=price-asc-rank` | 17 / 18 |

So the defect is amplified specifically by **sort + brand filter + a restrictive delivery location**.

**Technical / console notes**

No JavaScript console errors — this is a server-side result-composition issue, not a client render failure: unshippable ASINs are returned and top-ranked in a price sort despite having no price to sort by. Related observation (reported separately, low value): the Logitech-filtered "wireless mouse" list also returns *"Logitech **Wired** Mouse M90"* — a relevance defect, but ranking quality is out of scope for this assignment.

**Attachments** · `evidence/BUG-002_serp-price-sort-missing-prices_AND_BUG-003_location-conflict.jpg`

---

## BUG-003 — Two contradictory delivery destinations rendered on the same page: header says "Delivering to Nashville 37217", banner says items ship to Israel

| Field | Value |
|---|---|
| **Bug ID** | BUG-003 |
| **Title** | Search results page renders a stale US delivery location in the header glow while the notification banner on the same page states a different destination country — the customer cannot tell which pricing/availability applies |
| **Severity** | **Medium** — no functional block, but the user is shown two mutually exclusive facts about shipping, which silently invalidates every price and delivery estimate on the page |
| **Priority** | **P2** — trust and correctness issue in the funnel; fix this sprint |
| **Feature area** | Search / global header (delivery-location "glow" state) |
| **Environment** | Chrome 141, macOS, desktop 1568×745, signed-in session |
| **Preconditions** | Signed-in session whose account delivery location is a non-US country (here: Israel) |

**Steps to reproduce**

1. Sign in with an account whose delivery address resolves to a non-US country.
2. Navigate to `https://www.amazon.com/s?k=wireless+mouse&s=price-asc-rank`.
3. Apply the **Logitech** brand filter (AJAX partial update).
4. Compare the header glow block (`#glow-ingress-block`) with the delivery banner and with the PDP of any result.

**Expected result**

One single source of truth for the delivery destination across header, banner, SERP pricing and PDP within a session.

**Actual result**

On the same rendered frame (see screenshot):

- Header glow: **"Delivering to Nashville 37217"**
- Banner: **"We're showing you items that ship to Israel. To see items that ship to a different country, change your delivery address."**

Opening any result's PDP in the same session then renders the header as **"Deliver to Israel"** and the buy box as *"This item cannot be shipped to your selected delivery location"* with **no Add to Cart button at all** (`#add-to-cart-button` absent; replaced by "Add to Auto Buy" / "Add to List").

**Technical / console notes**

Reproduced once with a screenshot capturing both contradictory strings in a single frame; on subsequent navigations the glow settled to "Deliver to Israel" on `/`, `/s`, `/dp/…` and `/gp/cart/view.html` alike (verified by fetching all four and reading `#glow-ingress-block` server-rendered). This points to a **stale cached glow fragment** served on the first SERP render rather than a persistent state bug — hence Medium, not High. Reproduction rate observed: 1 of 3 attempts; a cold session / cache-cleared first navigation is the likely trigger. Flagged for the front-end team with the cached-fragment hypothesis rather than closed as not-reproducible, because the failure mode (wrong country's prices shown as authoritative) is high-impact when it happens.

**Attachments** · `evidence/BUG-002_serp-price-sort-missing-prices_AND_BUG-003_location-conflict.jpg` (both strings visible in one frame), `evidence/BUG-003_pdp-deliver-to-israel-no-add-to-cart.jpg`

---

## BUG-004 — Price-range filter is matched against the featured price but the card displays the used & new offer price, so results well below the filter floor are shown as if they matched

| Field | Value |
|---|---|
| **Bug ID** | BUG-004 |
| **Title** | With the price filter set to **$20 – $84**, 7 of 16 organic results display prices from **$8.69 to $15.85** — up to **57 % below the filter floor**. Every violating card is one with "No featured offers available", where the card falls back to showing the lowest used & new offer price |
| **Severity** | **High** — the filter is the customer's primary tool for narrowing by budget; it silently returns items whose only visible price contradicts the constraint they set |
| **Priority** | **P2** — high-visibility funnel correctness defect; fix this sprint |
| **Feature area** | Search — price refinement (`p_36`) vs. result-card price rendering |
| **Environment** | Chrome 141, macOS, desktop 1568×603, signed-in session, delivery location "Israel" |
| **Preconditions** | Signed in; delivery location where many listings have no featured offer (a non-US country reproduces this reliably) |

**Steps to reproduce**

1. Open `https://www.amazon.com/s?k=wireless+mouse`.
2. In the left rail under **Brands**, tick **Logitech**.
3. In the left rail under **Price**, drag the slider to **$20 – $84** (or use the range inputs) and apply.
4. Confirm the filter is genuinely active: the sidebar shows `$20 – $84` with a **Reset price range** link, and the result bar reads *"1-16 of 155 results"*.
5. Read the price line of each card top to bottom.

**Expected result**

Every result carries a visible price inside `$20.00 – $84.00`. If an item's only obtainable price falls outside the range, it must not be returned by that refinement — or, at minimum, the card must not present an out-of-range figure as the item's price.

**Actual result**

7 of 16 organic cards (none sponsored) show a price below `$20.00`:

| Pos | ASIN | Displayed price | Offers behind it |
|---|---|---|---|
| 1 | `B0BXNR9DB6` | **$15.85** | 61 used & new |
| 3 | `B0CPSP33T8` | **$15.44** | 20 used & new |
| 5 | `B01JPOLKDW` | **$10.78** | 30 used & new |
| 6 | `B00ADBY98A` | **$8.70** | 19 used & new |
| 8 | `B0F7QXWK9X` | **$12.31** | 26 used & new |
| 13 | `B0BPP8DRKL` | **$8.69** | 21 used & new |
| 15 | `B0…` (7th) | **$14.26** | — |

**Root cause is unambiguous: 7 of 7 violating cards carry "No featured offers available"** (`everyOffenderHasNoFeaturedOffer: true`), and **0 violations occur on cards that do have a featured price** (`featuredPriceViolations: 0`). The refinement filters on the *featured/list* price while the card renders the *lowest used & new offer* price. Two different price concepts, one of which the customer never asked to filter by.

**Verification snippet used**

```js
const MIN=20, MAX=84;
const cards=[...document.querySelectorAll('[data-component-type="s-search-result"]')];
const rows=cards.map((c,i)=>{
  const t=c.innerText;
  const feat=c.querySelector('.a-price .a-offscreen')?.textContent??null;
  const un=t.match(/\$([\d,]+\.\d{2})\s*\((\d+)\s*used\s*&\s*new/i);
  const v=feat?Number(feat.replace(/[^\d.]/g,'')):(un?Number(un[1]):null);
  return {pos:i+1, asin:c.getAttribute('data-asin'),
          displayed: feat??(un?'$'+un[1]:null),
          noFeaturedOffers:/no featured offers available/i.test(t),
          out: v!==null && (v<MIN||v>MAX)};
});
console.table(rows.filter(r=>r.out));
```

**Technical / console notes**

No JS console errors — server-side refinement/render mismatch, not a client failure. Verified the refinement was genuinely applied (result count dropped from >10 000 to **155**, `Reset price range` present) — this matters, because a hand-built `rh=p_36:5000-` URL is silently **ignored** by Amazon and returns the unfiltered set; the filter must be applied through the UI to test it validly. Cross-check on the same session: the `Up to $15` preset produced **0 violations**, so the defect is specific to ranges whose floor sits above the typical used-offer price.

Closely related to BUG-002 — both stem from items with no featured offer being returned by refinements that can only be evaluated against a featured price. Recommend fixing together.

**Attachments** · `evidence/BUG-004_price-filter-20-84-shows-15.85.jpg` (sidebar `$20 – $84` + Logitech checked + first card at `$15.85` in one frame)

---

## BUG-005 — "Compare with similar items" on a wireless mouse returns makeup sponges

| Field | Value |
|---|---|
| **Bug ID** | BUG-005 |
| **Title** | Mobile cart → "Compare with similar items" for a *TECKNET Wireless Mouse* renders a comparison set consisting entirely of makeup blender sponges — zero category overlap with the source product |
| **Severity** | **Medium** — the feature produces output that is not merely poor but categorically wrong; no workaround inside the widget |
| **Priority** | **P2** — visible trust damage in the cart, one step from checkout |
| **Feature area** | Cart (mobile web) — "Compare with similar items" widget |
| **Environment** | Chrome DevTools device emulation "Samsung Galaxy A51/71", 412×914 **and** 914×412, 3G throttling, mobile web cart `/gp/aw/c` |
| **Preconditions** | Signed in; a wireless mouse in the cart |

**Steps to reproduce**

1. In mobile emulation, open `https://www.amazon.com/gp/aw/c?ref_=navm_hdr_cart`.
2. On the *TECKNET Wireless Mouse Rechargeable, 2.4G* line item, tap **Compare with similar items**.
3. Read the products offered for comparison.

**Expected result** — Comparison set contains wireless mice or, at minimum, products from the same category (computer peripherals).

**Actual result** — All six tiles are cosmetics: *Amazon Basics Large Makeup Blender Sponges*, *Amazon Basics Cosmetic Rectangular Foam Wedges*, *e.l.f. Total Sponge Set*, *Beautyblender Original Beauty Blender*, *Beautyblender Original Pink Makeup Sponges*, *M. Asam Magic Finish Make-up Sponge Trio*. Not one peripheral. Reproduced in **both** orientations, so it is independent of viewport.

**Technical / console notes** — Category mismatch this complete points at the widget resolving the wrong seed ASIN (or falling back to a generic/session-unrelated recommendation set) rather than at ranking quality. Worth confirming whether the seed is taken from the cart line or from an unrelated browsing-history signal; that distinction decides whether this is a data bug or a wiring bug. Not classified as out-of-scope "ranking quality" precisely because the failure is categorical, not a matter of ordering.

**Attachments** · user-supplied screenshots, both orientations

---

## Not reproduced — reported for transparency

Two hypotheses from the initial risk analysis were tested and **did not reproduce**; they are listed here because a senior report should state what was ruled out, not only what was found.

| Hypothesis | Result |
|---|---|
| Sort order silently resets when a filter is applied after sorting | **Not reproduced.** After applying the brand filter, `#s-result-sort-select` = `price-asc-rank`, the URL retained `s=price-asc-rank`, and the priced cards were genuinely ascending (`$9.88 → $9.99 → $10.87 → $14.99`). Sort state is preserved correctly. |
| Cart quantity update corrupts server state / duplicates the line on network failure | **Not reproduced.** After reconnect + reload the cart was exactly qty 2 / $19.98 — the failed increment was not persisted and no duplicate line was created. Only the *client* dead-end is defective (BUG-001). |
| Recommendation carousels on the mobile cart disagree about whether an item is already in the cart | **Not reproduced.** Two screenshots appeared to show the same ASINs with and without the "Added to cart" badge, but a DOM audit returned `duplicatedAsins: 0` — no ASIN is rendered twice on the page, so the frames captured different carousels (or a lazy-loaded refresh), not conflicting state. |

---

## Additional observations — logged, deliberately not filed as bugs

Recorded for completeness. Each was assessed and judged below the bar for a bug report slot; the assignment weights one strong report above several weak ones.

| # | Observation | Assessment |
|---|---|---|
| OBS-1 | In the mobile-cart recommendation carousels, a card carrying the variable "Only N left in stock" line pushes its **Add to cart** button below the buttons of its neighbours — the CTA row is not bottom-aligned across the carousel | Cosmetic, Low / P4. 100 % reproducible and trivially fixable (`margin-top: auto` on the CTA within a column-flex card), but no functional loss and the surface is a recommendation widget, outside the Search / PDP / Cart scope |
| OBS-2 | Console carries WARN-level entries from Amazon's own telemetry (`ueLogError`, attribution `imageBlock-mobile-hi_res_alt_image_distortion`, `Diff: 0.03`) on PDPs reached from the cart | Not an application defect — Amazon's instrumentation correctly reporting a listing image-asset aspect-ratio deviation of 3 %. Logged to evidence that the console **was** audited on every flow (cross-cutting checklist §8): no ERROR-level entries were observed in Search, PDP or Cart |
| OBS-3 | The same console payload leaks an internal short link (`http://tiny/…`) into production output | Code hygiene, Low / P4. Not externally resolvable, so no security impact; noted rather than filed |
| OBS-4 | Search results for "wireless mouse" filtered to Logitech include *Logitech **Wired** Mouse M90* | Relevance/ranking quality — explicitly out of scope per test plan §1. Noted under BUG-002 rather than filed separately |
| OBS-5 | Language picker labels both Chinese scripts with the bare code `ZH` (`中文 (简体)` and `中文 (繁體)`) instead of `zh-Hans` / `zh-Hant` | Not a defect: the human-readable labels already disambiguate the script. BCP 47 nitpick only |
