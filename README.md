# ShopTest — Amazon.com Web Shopping QA (Senior QA Take-Home)

**Candidate:** Anton Trufanov
**Site under test:** https://www.amazon.com (live)
**Focus areas:** Search, Product Detail Page (PDP), Cart & Checkout

## Repository structure

```
├── README.md                      ← you are here
├── docs/
│   ├── 01-executive-summary.md    ← Deliverable C: approach & trade-offs (200–400 words)
│   ├── 02-test-plan.md            ← Deliverable A: scope, risk matrix, 24 scenarios
│   ├── 03-bug-reports.md          ← Deliverable B: 3 bug reports (all reproduced live)
│   ├── 04-execution-checklist.md  ← remaining work before submission
│   └── evidence/                  ← screenshots backing each bug report
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

> **Status:** `tsc --noEmit` passes and `playwright test --list` resolves 14 tests across both projects. A full green run against live amazon.com still has to be executed locally — see `docs/04-execution-checklist.md`, Block 1.

## Time spent (honest estimate)

| Activity | Time |
|---|---|
| Exploratory testing & DOM analysis (3 areas, 2 viewports, throttling) | ~2.0 h |
| Test plan & risk assessment | ~1.5 h |
| Bug reproduction & reports | ~1.0 h |
| Automation framework & stabilization runs | ~1.5 h |
| **Total** | **~6 h** |
