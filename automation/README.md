# ShopTest Automation — Playwright + TypeScript (POM)

E2E suite for amazon.com covering the critical guest revenue path:
Search → PDP → Add to Cart → Cart → checkout auth gate.

## Prerequisites

Node.js ≥ 18 — nothing else.

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

Locators follow a strict fallback hierarchy verified against the live DOM (Aug 2026): ARIA role + accessible name first (`getByRole('searchbox', { name: /search amazon/i })`), then stable data attributes and semantic IDs (`[data-component-type="s-search-result"]`, `[data-asin]`, `#add-to-cart-button`, `#sc-buy-box-ptc-button`), never generated class chains or long XPath. All waiting is Playwright auto-waiting plus web-first assertions (`expect(locator)…`, `expect.poll`) — zero fixed sleeps. Amazon A/B-serves three different add-to-cart confirmation UIs and two cart quantity widgets; the page objects handle every variant. `workers: 1` and realistic `Accept-Language`/locale keep the anti-bot wall away; if a CAPTCHA is still served, `BasePage` fails fast with an actionable message instead of a cryptic timeout.

## Anti-bot & ethics notes

No login, no payment data, no credential storage (env vars would be used if auth were ever needed). Tests stop at the sign-in redirect by design and never place orders. Runs add at most one item to an anonymous guest cart.
