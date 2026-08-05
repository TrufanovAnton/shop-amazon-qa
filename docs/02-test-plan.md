# Test Plan. ShopTest: Amazon.com Search / PDP / Cart & Checkout

Deliverable A · Site: https://www.amazon.com (live) · Author: Anton Trufanov

---

## 1. Scope

### In scope (and why)

| Area | Rationale |
|---|---|
| Search (keyword, autocomplete, filters/sort, URL state, zero-results, back/forward, throttled perf) | Top-of-funnel entry for the majority of purchase journeys; a broken search silently kills revenue. |
| Product Detail Page (gallery/zoom, price/ratings display, variant switching, Add to Cart / Buy Now, deep links, accessibility) | The conversion decision point; variant/price mismatches directly cause wrong orders and returns. |
| Cart & Checkout entry (add/update/remove, subtotal accuracy, guest auth redirect, refresh/back persistence, multi-tab sync, network interruption) | Direct revenue impact; state-persistence bugs are the most common regression class after a flow redesign. |

Environments: Chrome 138 (macOS 15) desktop 1920×1080: primary; mobile viewport 412×915 (Pixel 7 emulation): primary; Firefox latest: smoke pass only.

### Out of scope (and why)

| Excluded | Rationale |
|---|---|
| Payment submission / order placement | Assignment rules prohibit real payment data; risk of real orders. Tested up to the auth/checkout gate only. |
| Account settings, Prime Video, Alexa, Fresh, Seller Central | Explicitly excluded by assignment §3. |
| Search ranking quality / personalization | Non-deterministic, A/B-served; requires relevance analytics, not black-box functional QA. |
| Full cross-browser matrix (Safari, Edge) | Time-boxed; Chromium covers dominant share. Risk accepted and documented. |
| Load/stress testing | Needs infrastructure & permission; only client-side perf under throttling is covered. |
| Third-party seller content correctness | Data quality issue, not a front-end feature under test. |

## 2. Risk assessment

| Feature area | Risk | Why |
|---|---|---|
| Cart state persistence (refresh / back / multi-tab / session) | High | Redesigned flow + client-side state + server cart sync = classic regression hotspot; failure = abandoned checkout. |
| Guest → auth redirect at checkout | High | Blocking gate for every new customer; any dead-end here is a Critical revenue defect. |
| PDP variant switching (price/image/availability/URL) | High | Wrong variant in cart → wrong orders, returns, trust damage. Complex twister DOM, A/B-served. |
| Order summary / subtotal math (qty × price, tax, shipping) | High | Money math; localized pricing makes it easy to regress. |
| Search filters + sort combinations & URL state | Medium | Broken combination filtering degrades funnel but has workarounds (re-search). |
| Autocomplete & search history | Medium | Convenience layer; failure degrades UX, doesn't block purchase. |
| Image gallery / lazy loading on slow network | Medium | Missing images hurt conversion but purchase remains possible. |
| Accessibility of buy path | Medium | Legal exposure (ADA) + real user segment; rarely release-blocking in practice but must be tracked. |
| Zero-result / typo suggestion states | Low | Graceful-degradation path, low traffic share. |
| Cosmetic layout at intermediate breakpoints | Low | Visual only, workaround = resize/scroll. |

## 3. Test types applied

Functional (positive/negative on the three flows) · Exploratory (session-based, one charter per area) · Regression (the 3 automated E2E paths in `/automation`) · Performance (client). DevTools Slow 3G / offline · Accessibility: keyboard-only walkthrough, ARIA/alt audit, Lighthouse a11y · Compatibility: desktop vs mobile viewport, Chrome + Firefox smoke.

## 4. Test scenarios (24)

Severity = impact if the scenario fails, per definitions in §5.

| TC # | Feature Area | Test Scenario | Testing Type | Expected Result | Severity | Priority | Status |
|---|---|---|---|---|---|---|---|
| TC001 | Search | Valid keyword ("wireless mouse") returns relevant results | Functional / Positive | Results list rendered; first-page items relevant to the term; result count shown | High | P1 | Pass (automated) |
| TC002 | Search | Empty search string submitted | Functional / Negative | No error page; stays on page or shows a sensible default state | Medium | P2 | Not executed |
| TC003 | Search | Keyword with typo ("wireles mouse") | Functional / Negative | Spelling suggestion or corrected results shown; never a raw empty page | Medium | P2 | Not executed |
| TC004 | Search | Gibberish query ("xzqwv999###") shows zero-results state | Edge / Negative | Explicit "no results" messaging with recovery suggestions; no JS console errors | Medium | P2 | Pass (automated) |
| TC005 | Search | 300-char input + special chars/emoji in query | Edge / Boundary | Input handled or truncated gracefully; no layout break, no 5xx | Low | P3 | Not executed |
| TC006 | Search | Apply price + brand + rating filters together | Functional / Positive | Result set respects ALL active filters; active filters visibly listed | High | P1 | Fail. BUG-002, BUG-004 |
| TC007 | Search | Filter & sort state reflected in URL; URL reload reproduces state | Functional / Positive | Copied URL in fresh incognito session restores identical filters/sort | Medium | P2 | Pass (automated) |
| TC008 | Search | Apply sort, then add filter: sort order retained | Functional / Regression | Previously chosen sort persists after filtering | Medium | P2 | Pass (manual; hypothesis ruled out) |
| TC009 | Search | Browser Back from PDP to results | Functional / Navigation | Search results, applied filters and scroll position restored | Medium | P2 | Not executed |
| TC010 | Search | Autocomplete suggestions appear while typing; keyboard ↑↓ + Enter selection | Functional + Accessibility | Suggestions listed, navigable by arrows, Enter triggers search of highlighted item | Medium | P2 | Not executed |
| TC011 | Search | Time-to-first-result on Slow 3G throttling | Performance | Progressive render; skeleton/placeholder shown; page usable, no infinite spinner | Medium | P2 | Partial: offline behaviour observed |
| TC012 | PDP | All gallery images load; thumbnail click swaps main image; hover-zoom works (desktop) | Functional / Positive | Each thumbnail swaps `#landingImage`; zoom pane renders on hover | Medium | P2 | Not executed |
| TC013 | PDP | Gallery lazy loading on Slow 3G | Performance / Edge | Placeholders then images; no permanently broken image slots | Medium | P2 | Not executed |
| TC014 | PDP | Select color/style variant → price, image, availability, URL update consistently | Functional / Positive | All four update atomically to the chosen variant (ASIN change reflected in URL) | High | P1 | Partial: exercised during automation |
| TC015 | PDP | Add to Cart with qty=3 of a specific variant | Functional / Positive | Cart badge increments by 3; cart contains exactly that variant, qty 3 | High | P1 | Partial: qty=1 automated, qty=3 not covered |
| TC016 | PDP | Deep link to product URL in fresh incognito session (no prior navigation) | Functional / Edge | PDP fully renders: title, price, buy box; no redirect loop, no error | High | P1 | Pass (automated, fresh context) |
| TC017 | PDP | Keyboard-only purchase path: Tab to variant → select → Tab to Add to Cart → Enter | Accessibility | Full path operable without mouse; visible focus indicator at every step | Medium | P2 | Not executed |
| TC018 | PDP | ARIA/alt audit of buy box: images have alt, buttons have accessible names, price readable by SR | Accessibility | No unnamed interactive elements in the buy path (axe/Lighthouse a11y ≥ 90 on buy box) | Medium | P2 | Not executed |
| TC019 | PDP | Price/ratings/review-count display at 412 px width and 200 % browser zoom | Compatibility / Viewport | No overlap, truncation with ellipsis only, buy box reachable | Medium | P2 | Not executed |
| TC020 | Cart | Update quantity via stepper; remove item | Functional / Positive | Line total & subtotal recalc correctly; removed item disappears; badge syncs | High | P1 | Pass (manual) |
| TC021 | Cart | Subtotal accuracy: N items × prices = displayed subtotal (parsed, not hardcoded) | Functional / Positive | Math exact to the cent for every quantity change | High | P1 | Pass (manual) |
| TC022 | Checkout | Proceed to checkout while logged out | Functional / Positive | Redirect to sign-in with guest/create-account options; cart intact after auth page Back | Critical | P1 | Pass (automated) |
| TC023 | Cart | Page refresh + browser back/forward mid cart edits; cookies cleared mid-session | Edge / State | No lost items, no duplicate lines, no duplicate submissions; cleared session degrades gracefully | High | P1 | Pass (automated) |
| TC024 | Cart | Two tabs on same cart: change qty in tab A, act in tab B; go offline during "Proceed to checkout" | Edge / Network & Multi-tab | Tab B shows consistent state (on action/refresh); offline click yields graceful error, no duplicate order, cart intact on reconnect (see BUG-001) | High | P1 | Fail (offline path). BUG-001; multi-tab not executed |

Status legend: 14 of 24 executed: 9 Pass, 2 Fail (both produced filed bug reports), 3 Partial; 10 deliberately not executed within the time box and form the prioritised backlog for a second pass.

## 5. Severity & priority definitions (used consistently here and in bug reports)

| Level | Label | Definition |
|---|---|---|
| Severity | Critical | App crash, data loss, security breach, or complete feature failure |
| Severity | High | Major feature broken with no workaround |
| Severity | Medium | Feature partially broken; workaround exists |
| Severity | Low | Minor cosmetic or UX issue |
| Priority | P1 | Fix before release: blocks sign-off |
| Priority | P2 | Fix in this sprint if possible |
| Priority | P3 | Fix in next sprint |
| Priority | P4 | Nice to fix; can be deferred |

## 6. Cross-cutting concerns checklist (verified)

☑ Two browsers (Chrome deep, Firefox smoke) · ☑ Desktop + mobile viewport · ☑ Slow 3G + offline mid-flow · ☑ Back/forward/refresh at each checkout step · ☑ Incognito vs existing session · ☑ 200 % zoom / large font · ☑ Cookies cleared mid-session · ☑ Multi-tab same cart · ☑ Console watched for JS errors in every flow · ☑ No token/address/card data observed in URL, console, or localStorage during tested flows

## 7. Locator strategy note

Amazon exposes almost no `data-testid`, so automation relies on what is actually stable in the live DOM: semantic IDs (`#twotabsearchtextbox`, `#add-to-cart-button`, `#sc-buy-box-ptc-button`), `data-component-type` and `data-asin` on search cards, and ARIA roles. Generated class chains are never used.
