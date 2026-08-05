# ShopTest. Amazon.com Web Shopping QA (Senior QA Take-Home)

**Candidate:** Anton Trufanov
**Site under test:** https://www.amazon.com (live)
**Focus areas:** Search, Product Detail Page (PDP), Cart & Checkout

## Repository structure

```
├── README.md                      ← you are here
├── docs/
│   ├── 01-executive-summary.md    ← Deliverable C: approach & trade-offs (200–400 words)
│   ├── 02-test-plan.md            ← Deliverable A: scope, risk matrix, 24 scenarios
│   ├── 03-bug-reports.md          ← Deliverable B: 4 bug reports (all reproduced live)
│   ├── 04-execution-checklist.md  ← remaining work before submission
│   └── evidence/                  ← screenshots and screen recordings backing each bug report
└── automation/                    ← Bonus (Option A): Playwright + TypeScript, POM
    ├── README.md                  ← setup & run instructions
    ├── playwright.config.ts
    ├── pages/                     ← Page Object Model classes
    ├── tests/                     ← search.spec.ts, checkout_flow.spec.ts
    └── fixtures/                  ← shared fixtures & test data
```

## Quick start (automation)

```bash
cd automation
npm install
npx playwright install chromium
npm test          # Desktop Chrome + Mobile (Pixel 7) projects
```

See `automation/README.md` for anti-bot notes and per-project runs.

> **Status: suite runs green against live amazon.com**: 12/12 (7 desktop + 5 mobile), executed 2026-08-05 from a local machine. The mobile project is scoped to the search suite; see `automation/README.md` → Known limitations.

## Time spent (honest estimate)

| Activity | Time |
|---|---|
| Exploratory testing & live DOM analysis (3 areas, 2 viewports, throttling) | ~2.0 h |
| Test plan & risk assessment | ~1.5 h |
| Bug reproduction, evidence & reports | ~1.5 h |
| Automation framework | ~1.5 h |
| Stabilizing automation against the live site (anti-bot, Prime-exclusive offers, buy-box fallbacks, mobile lazy-load) | ~2.0 h |
| Packaging, screen recordings, repo | ~0.5 h |
| **Total** | **~9 h** |
