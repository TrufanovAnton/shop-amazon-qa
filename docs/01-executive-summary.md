# Executive Summary: Approach and Trade-offs

**Deliverable C**

My strategy is risk-based: every scenario is weighted by its distance from revenue. The most valuable journey on Amazon is Search, then PDP, then Add to Cart, then checkout entry, so this path got the deepest coverage. I tested positive and negative paths under degraded conditions (offline mid-flow, refresh and back navigation, throttling) instead of spreading effort thinly.

Priorities: cart and checkout state integrity first, because failures there cost money and state bugs are the most common regression class after a flow redesign; then filter and sort correctness with URL-reflected state, PDP variant switching, and accessibility of the buy path.

What I skipped: payment submission (rules forbid real payment data), account settings, Prime and Fresh (out of scope), ranking quality (non-deterministic, A/B-served), the full cross-browser matrix, and API automation. Amazon has no public search or product API, and its internal XHR endpoints are anti-bot protected and unstable, so I traded Option B for one option done well; the viable API target and a plan for it are in the automation README.

Amazon specifics shaped the work. I verified the live DOM before writing automation: there are almost no `data-testid` attributes, so locators rely on stable semantic IDs, `data-component-type` and `data-asin`, and ARIA roles, never on generated class chains. The framework survives anti-bot interstitials, the location popover, A/B DOM variants, Prime-exclusive offers and buy-box fallbacks: it iterates priced candidates until it lands on a PDP an anonymous session can actually buy. Prices are parsed, never hardcoded. Guest checkout stops at the auth redirect.

Result: four defects, all reproduced live. A cart line dead-ends in a permanent spinner, no error, no retry, after a failed quantity update, while checkout stays enabled (High/P1). A $20–$84 price filter returns items displayed at $8.69–$15.85, because the refinement matches the featured price while the card shows the used-offer price (High/P2). A price-ascending sort puts price-less, un-actionable cards on top (Medium/P2). The comparison widget offered makeup sponges as alternatives to a wireless mouse (Medium/P2). Two of these share one root cause, so I recommend fixing them together. Three more suspicions did not survive re-testing and are listed at the end of the bug report. Knowing what is not broken is part of the result.

With more time: Firefox and WebKit runs, a screen-reader pass, autocomplete API checks, mobile-web checkout page objects.
