# ShopTest Automation. Playwright + TypeScript (POM)

E2E suite for amazon.com covering the critical guest revenue path:
Search → PDP → Add to Cart → Cart → checkout auth gate.

## Prerequisites

Node.js ≥ 18: nothing else.

## Setup (fresh machine)

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm test               # all projects: Desktop Chrome 1920×1080 + Pixel 7
npm run test:desktop   # desktop only
npm run test:mobile    # mobile viewport only
npm run test:headed    # watch it run (also helps if a CAPTCHA appears)
npm run report         # open the HTML report
npm run typecheck      # tsc --noEmit
```

Failed tests keep **trace, screenshot and video** (`playwright-report/`, view with `npm run report`).

## Structure

```
playwright.config.ts    2 projects, retries=1, workers=1, realistic locale headers
fixtures/
  pom.ts                test.extend fixture injecting page objects
  testData.ts           data-driven search terms + negative query
pages/
  BasePage.ts           navigation, CAPTCHA fail-fast, popup dismissal, cart badge
  SearchResultsPage.ts  search box, result cards, relevance assertions
  ProductDetailPage.ts  variants (inline twister), qty, Add to Cart (all A/B confirmation UIs)
  CartPage.ts           line items by ASIN, qty (stepper & dropdown UIs), subtotal, PTC auth gate
tests/
  search.spec.ts        data-driven positive (3 keywords), zero-result negative, URL-state
  checkout_flow.spec.ts guest E2E to auth redirect; cart persistence across reload
```

## Design decisions

Locator order: ARIA role or stable ID first, `data-component-type`/`data-asin` second, never generated class chains. All waiting is Playwright auto-waiting and web-first assertions; the one deliberate exception is noted under Known limitations. Amazon A/B-serves several add-to-cart confirmations and two cart quantity widgets, the page objects handle all of them. `workers: 1` plus realistic locale headers keep the CAPTCHA wall away; if it still appears, tests fail fast with a clear message.

## API testing (Option B): considered, skipped

Amazon has no public search or product API, and the internal XHR endpoints are anti-bot protected and change without notice, so tests against them would be flaky by design. The one realistic target is the autocomplete endpoint (`completion.amazon.com/api/2017/suggestions`): with Playwright's `request` fixture it would take three checks (valid prefix returns relevant suggestions, garbage prefix handled gracefully, field-level assertions). Skipped in favour of finishing one option well.

## Known limitations

- **Mobile project runs the search suite only.** Amazon serves a distinct
  mobile DOM for PDP and cart (different title element, different buy box),
  so the guest-checkout page objects are desktop-scoped. Adapting them is
  straightforward follow-up work (mobile locator variants in the same POM).
- **One fixed 300 ms debounce** exists in `selectFirstAvailableVariants()`
  (twister re-render between swatch clicks); all other waiting is
  auto-waiting / web-first assertions.
- Runs from a non-US network: the framework sets a US delivery ZIP
  best-effort and skips offers an anonymous session cannot buy
  (Prime-exclusive deals, buy-box fallbacks, unshippable listings).

## Anti-bot & ethics notes

No login, no payment data, no credential storage (env vars would be used if auth were ever needed). Tests stop at the sign-in redirect by design and never place orders. Runs add at most one item to an anonymous guest cart.
