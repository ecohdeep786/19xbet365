# Real-User Product Audit — 25 November 2026

**Product:** 19xbet365 at `http://127.0.0.1:4000`
**Build:** production Vite bundle served by Express (`index-CPq1rqqV.js`, ~168 KB gzip)
**Database:** PostgreSQL 16 `astra_play` at `127.0.0.1:5433`
**Test method:** Playwright/Edge as a brand-new player, then Master Admin, with screenshots and console/network monitoring.

Evidence: `capture/live-audit-2026-11-25/` and `scripts/live-user-audit.mjs`.

## 1. Result summary

| Area | Result |
| --- | --- |
| Core player journeys | **22/22 implemented checks passed** |
| Full audit (including missing production/fantasy gates) | **22/27 checks passed** |
| Console/page errors | None from implemented UI; only expected 404s from absent KYC, withdrawal and fantasy endpoints |
| Visual/responsive | No layout failures observed in this run; 1440px desktop and 390px mobile drawer tested |

The five failed checks are not regressions in the existing product. They are missing capabilities:

1. No `#/fantasy` route.
2. No KYC endpoint (`404`).
3. No withdrawal endpoint (`404`).
4. No fantasy-contests API (`404`).
5. The three missing endpoints produce console 404s when probed.

## 2. What was tested and passed

### New-player onboarding
- Registered a new account through the real UI.
- Landed on the account dashboard.
- Received exactly **10,500.00 coins**.
- Saw a correct welcome ledger entry, empty game history and a level-1 profile.

### Sportsbook
- Opened `/sports`.
- Selected a 1X2 outcome at 2.05.
- Opened the bet slip, entered a 100-coin stake and placed the bet.
- Balance moved from **10,500.00 → 10,400.00 coins**.
- Toast confirmed the server response and potential return.

### Instant game
- Opened Dice Roll, launched a round, and received a settled server result.
- Wallet recorded the game stake and result.

### Wallet
- Wallet showed the bet and game entries with correct balance-after values.
- Withdrawal is visible but disabled.
- The page states that live cash-out is disabled.

### Sandbox deposit and bonus
- Submitted a 500-coin sandbox deposit with a unique UTR reference.
- Request appeared as pending in player history.
- Master Admin saw the same request in the deposit review queue.
- Admin approved it.
- Player received **500.00 coins + 50.00 coins (10% tier bonus)**.
- Ledger showed both the deposit and bonus entries.
- Final balance: **10,900.00 coins** after the earlier 100-coin bet and 50-coin game loss.

### Responsible gaming
- Opened the responsible-play page.
- Saved a daily coin limit through the UI and received confirmation.

### Support
- Opened a support ticket as the new player and received confirmation.

### Mobile
- At 390px, the drawer opened as a dialog and closed on Escape.
- The player card, coin balance, navigation sections and sign-out action rendered.

### Master Admin
- Deposit queue loaded the real player request and displayed the reference.
- Approval action completed and returned the expected totals.
- Admin audit/operational shell remains separate from the player theme.

## 3. What is missing for the stated product goal

The current product is a **sandbox sportsbook and casino**. It is **not a fantasy gaming platform** yet.

### 3.1 Fantasy is absent end-to-end
- No Fantasy navigation item.
- `/#/fantasy` renders the 404 page.
- `/api/fantasy/contests` returns `404`.
- No fantasy tables, player pool, lineup builder, contest entry, scoring, leaderboard or settlement.
- No fantasy terms, contest rules, cancellation policy or prize structure.

This is the largest goal gap. Everything else is supporting infrastructure around a different product category.

### 3.2 Real-money rail is not complete
Current gates:

```json
{
  "depositMode": "sandbox",
  "livePaymentsEnabled": false,
  "realMoneyEnabled": false,
  "kycRequired": false
}
```

Missing:
- KYC identity/document flow and provider.
- Withdrawal request, approval, payment execution and reconciliation.
- Live payment QR / merchant account / webhook confirmation.
- Deposit and withdrawal limits; source-of-funds checks.
- Jurisdiction/geo eligibility for fantasy contests.
- Tax and prize-reporting rules.
- Real-money fantasy terms, contest rules and responsible-play controls.

### 3.3 Real sports and player data
- Fixtures are seeded demo data and a demo settlement worker.
- No authorized fixture feed, live scores, player roster or player-stat feed.
- A salary-cap fantasy product needs player-level scoring data, which does not exist in the current schema.

### 3.4 Operational hardening
- Email/SMS delivery for verification and password reset.
- Full 2FA provisioning.
- CSP/CSRF tokens, Redis/distributed rate limits.
- Backup/PITR, monitoring/alerting, reconciliation jobs.
- External penetration test and legal review.

## 4. Defects found during the audit

### A. Demo sportsbook can go empty after fixtures settle
The first audit attempt found no bettable match rows because all seeded fixtures had already settled. The sportsbook only becomes useful again after a reseed.

Impact: a reviewer opening the demo later can see an empty sportsbook. This is a demo lifecycle defect, not a real-money engine defect.

Fix options:
- Roll seeded fixtures forward when the upcoming pool falls below a threshold.
- Add a scheduled demo-fixture refresh job.
- Add an admin “refresh demo fixtures” action.
- In production, replace this entirely with an authorized feed.

### B. Admin deposit queue shows `+0.00 coins` bonus before approval
The player sees an estimated 10% bonus, and approval credits it, but the pending admin row shows `+0.00 coins` because `bonus_amount` is only written at approval time.

Impact: the reviewer cannot see the expected bonus before approving.

Fix: store the expected bonus tier/amount at request creation, or compute an “expected bonus” for pending requests and label it clearly.

### C. Missing endpoints return raw 404s
Direct probes of KYC, withdrawal and fantasy APIs emit console 404s. There are no friendly “not available yet” states because those product areas do not exist.

Fix: build the features, or add explicit disabled/coming-soon states without pretending they are live.

## 5. Production readiness matrix

| Capability | Status | Why |
| --- | --- | --- |
| Sandbox sportsbook + casino | Ready for demo | Core journeys pass |
| New-player onboarding | Ready for demo | Verified end-to-end |
| Coin wallet and ledger | Ready for demo | Verified entries and balances |
| Sandbox deposit + bonus | Ready for demo | Verified player/admin flow |
| Support and responsible tools | Ready for demo | Verified UI flows |
| Fantasy contests | **Not started** | No route, API, schema or UI |
| KYC | **Not started** | No page or endpoint |
| Withdrawals | **Not started** | Disabled/404 |
| Live payment collection | **Blocked** | No QR, merchant account or live gate enabled |
| Real-money fantasy launch | **NO-GO** | Product + legal + payments + data provider missing |

## 6. Recommended next build

The next build should be a **fantasy MVP**, not another sportsbook polish pass.

Recommended first vertical slice:

- **Format:** salary-cap daily fantasy, 11-player lineup, 100-credit salary cap, captain multiplier.
- **First sport:** football using the existing football fixtures, or cricket if that is the target market.
- **Contest:** one free/demo contest and one coin-entry contest; prize tiers for the top 3.
- **Entry:** coin entry debited transactionally; one or limited entries per player.
- **Lineup:** server-validated player count, positions, salary cap, duplicates and captain.
- **Lock:** entries lock at contest start; late entries rejected server-side.
- **Scoring:** demo player-stat lines until a real provider is contracted.
- **Settlement:** server-authoritative leaderboard, ties split, prizes credited to wallets, audit entries.
- **Admin:** create, cancel/refund, lock and settle; view entries and payouts.
- **Compliance UI:** 18+, contest rules, cancellation/refund policy, responsible-play links, sandbox banner until licensed.

Detailed plan: `docs/FANTASY_MVP_PLAN.md`.

## 7. Immediate engineering fixes before the fantasy build

1. Add a demo-fixture rollover/refresh so the sportsbook never goes empty.
2. Show expected deposit bonus in the admin review queue.
3. Add friendly disabled states for KYC/withdraw/fantasy probes instead of raw 404s.
4. Keep the real-money gates locked until the legal/payment/KYC track is complete.

## 8. Decision required

The product definition must be fixed before building:

- Which market and sport is the fantasy product for?
- Salary-cap DFS, prediction contests, or season-long leagues?
- Is the first release coin-sandbox only, or does it need real-money entry immediately?
- What is the contest entry range, prize structure and rake?
- Which KYC/payment providers will be used?

Without answers to these, a fantasy build would be a generic prototype rather than a production product.

## 9. Post-audit control additions

After the live test, a first Master/Admin control slice was added:

- **Revenue & risk** page at `/admin/revenue`, available to Master Admin and scoped Admin users with `reports.view.scope`.
- It shows gross gaming revenue, sportsbook GGR, games GGR, open sports exposure, approved deposits, ongoing promotional cost, welcome allocations, net gaming revenue, active players and product-level game GGR.
- **Sports risk caps** added as Master-only settings and enforced server-side:
  - `maxSportsStake` (default 5,000 coins)
  - `maxSportsPayout` (default 50,000 coins)
- Settings are grouped under **Risk controls**; changes are audited with before/after values.
- `scripts/risk-smoke.mjs` verifies Master/Admin revenue access, Player denial, and rejection of stakes/potential returns above the caps.

The page explicitly states that outcomes and settled records are immutable. Staff control configuration, limits and settlement rules, not individual results.
